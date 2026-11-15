// 차 장군 — 방위청 사령관, 50대 중반 (「에이아 연대기」 전신 입간판, viewBox 0 0 1200 2400)
// 차도윤의 아버지: 같은 날카로운 눈매. 어깨에 걸친 외투, 의장검 위에 포갠 두 손
export const ID = "general", NAME = "차 장군";

const P = "general-";
const INK = "#1a1626";
const SK = { b: "#f0cfbb", s: "#d6a08e", d: "#b07468", h: "#fff0e4" };
const HR = { b: "#24232b", s: "#17161d", d: "#0d0c12", h: "#55546a", g: "#8a8aa0", gray: "#a9adb8", grayS: "#7c808e" };
const UN = { b: "#3a3d47", s: "#2a2c35", d: "#1c1d25", h: "#5b5f6e" }; // 제복
const CO = { b: "#2e3038", s: "#21222a", d: "#15161c", h: "#4c4f5c" }; // 외투
const LN = { b: "#5e1f2b", s: "#40141d", h: "#8a3442" }; // 외투 안감
const GD = { b: "#d9c27a", s: "#a88c42", d: "#76602c", h: "#fff4c8" };
const GL = { b: "#f4f4f2", s: "#c9cbd2", d: "#9a9eaa", h: "#ffffff" };
const RIM = "#a8d8ff";

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
function fing(pts, w, fill = GL.b, sh = GL.s) {
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  const n = pts[pts.length - 1];
  return L(d, w + 6, INK) + L(d, w, fill) + `<path d="${d}" fill="none" stroke="${sh}" stroke-width="${f(w * 0.38)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(w * 0.18)} ${f(w * 0.16)})"/>` +
    `<ellipse cx="${f(n[0] - w * 0.1)}" cy="${f(n[1] - w * 0.1)}" rx="${f(w * 0.2)}" ry="${f(w * 0.14)}" fill="#fff" opacity="0.9"/>`;
}
function rimL(d, w = 5, op = 0.85) { return L(d, w, RIM, ` opacity="${op}"`); }
const btn = (x, y, r = 10) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${P}goldR)" stroke="${INK}" stroke-width="2.5"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.3)}" fill="#fff" opacity="0.85"/>`;
const star = (x, y, r, fill = GD.b) => {
  let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? "L" : "M") + f(x + Math.cos(a) * rr) + " " + f(y + Math.sin(a) * rr); }
  return S(d + "Z", fill, 1.8);
};

// ── 그라데이션 ──────────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a5c"/><stop offset="0.5" stop-color="${HR.b}"/><stop offset="1" stop-color="#121117"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe6d8"/><stop offset="0.6" stop-color="${SK.b}"/><stop offset="1" stop-color="#e2b4a2"/></linearGradient>
<linearGradient id="${P}uni" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="${UN.h}"/><stop offset="0.45" stop-color="${UN.b}"/><stop offset="1" stop-color="${UN.d}"/></linearGradient>
<linearGradient id="${P}coat" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="${CO.h}"/><stop offset="0.4" stop-color="${CO.b}"/><stop offset="1" stop-color="${CO.d}"/></linearGradient>
<linearGradient id="${P}coatR" x1="1" y1="0" x2="0" y2="0.2"><stop offset="0" stop-color="#1a1b22"/><stop offset="0.6" stop-color="${CO.b}"/><stop offset="1" stop-color="${CO.s}"/></linearGradient>
<linearGradient id="${P}lin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${LN.h}"/><stop offset="0.5" stop-color="${LN.b}"/><stop offset="1" stop-color="${LN.s}"/></linearGradient>
<linearGradient id="${P}pant" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${UN.h}"/><stop offset="0.45" stop-color="${UN.b}"/><stop offset="1" stop-color="${UN.d}"/></linearGradient>
<linearGradient id="${P}boot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3c3c4a"/><stop offset="0.3" stop-color="#14141a"/><stop offset="0.7" stop-color="#0b0b10"/><stop offset="1" stop-color="#26262f"/></linearGradient>
<linearGradient id="${P}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GD.h}"/><stop offset="0.4" stop-color="${GD.b}"/><stop offset="1" stop-color="${GD.s}"/></linearGradient>
<linearGradient id="${P}goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GD.s}"/><stop offset="0.3" stop-color="${GD.h}"/><stop offset="0.6" stop-color="${GD.b}"/><stop offset="1" stop-color="${GD.d}"/></linearGradient>
<radialGradient id="${P}goldR" cx="0.35" cy="0.35" r="0.7"><stop offset="0" stop-color="${GD.h}"/><stop offset="0.5" stop-color="${GD.b}"/><stop offset="1" stop-color="${GD.d}"/></radialGradient>
<linearGradient id="${P}sheath" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a4658"/><stop offset="0.3" stop-color="#1a1822"/><stop offset="1" stop-color="#08080c"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1018"/><stop offset="0.5" stop-color="#2e3446"/><stop offset="0.85" stop-color="#5e6a84"/><stop offset="1" stop-color="#9aa8c0"/></linearGradient>`;

// ── 외투 뒷자락 ─────────────────────────────────────
function coatBack() {
  const d = "M400 480 C360 700 330 1000 310 1300 C290 1600 270 1850 250 2060 C380 2090 520 2096 640 2092 C760 2090 880 2080 960 2050 C1010 2030 1060 2000 1100 1960 C1060 1920 1040 1870 1046 1820 C990 1780 960 1700 940 1600 C900 1300 860 900 800 480Z";
  const inner = F(d, `url(#${P}lin)`) +
    L("M440 900 C420 1300 400 1700 380 2090", 3, LN.s) + L("M560 1000 C550 1400 545 1800 540 2094", 3, LN.s) +
    L("M700 1000 C730 1400 760 1800 790 2088", 3, LN.s) + L("M820 1100 C880 1500 950 1800 1046 1820", 3, LN.s) +
    F("M940 1600 C960 1700 990 1780 1046 1820 C1040 1870 1060 1920 1100 1960 L1120 1930 C1060 1860 1010 1740 980 1600Z", "#2a0c12", ` opacity="0.6"`) +
    F("M400 480 L800 480 L800 1000 C700 1060 500 1060 400 1000Z", "#000", ` opacity="0.35"`);
  return part(d, LN.b, inner, 5) + rimL("M1046 1822 C1040 1870 1060 1920 1098 1958", 4, 0.7);
}

// ── 다리·장화 ───────────────────────────────────────
function legs() {
  const Lg = "M520 1130 C500 1300 488 1450 476 1600 C468 1700 466 1760 468 1800 L580 1806 C584 1760 588 1700 592 1600 C598 1450 604 1300 604 1150Z";
  const Rg = "M600 1150 C604 1300 618 1450 628 1600 C632 1700 636 1760 640 1800 L752 1796 C752 1760 748 1700 742 1600 C732 1450 712 1300 690 1130Z";
  const shL = F("M560 1150 C566 1350 568 1550 566 1806 L580 1806 C584 1760 588 1700 592 1600 C598 1450 604 1300 604 1150Z", UN.d, ` opacity="0.7"`) +
    L("M496 1300 C490 1450 484 1600 480 1780", 9, GD.s) + L("M496 1300 C490 1450 484 1600 480 1780", 4, GD.h, ` opacity="0.7"`) + // 장군 측선
    L("M540 1250 C546 1270 560 1278 580 1276", 2.5, UN.d) + L("M530 1500 C548 1520 570 1524 588 1516", 2.5, UN.d);
  const shR = F("M670 1150 C690 1350 712 1550 730 1800 L752 1796 C752 1760 748 1700 742 1600 C732 1450 712 1300 690 1130Z", UN.d, ` opacity="0.8"`) +
    L("M710 1300 C722 1450 732 1600 740 1780", 9, GD.s) + L("M710 1300 C722 1450 732 1600 740 1780", 3, GD.b, ` opacity="0.8"`) +
    L("M626 1260 C640 1276 660 1280 680 1274", 2.5, UN.d) + L("M636 1520 C656 1534 676 1536 700 1528", 2.5, UN.d);
  // 무릎 위까지 오는 광택 승마 장화
  const bootL = "M466 1760 C456 1800 450 1880 454 1980 C460 2100 464 2200 460 2290 C440 2320 400 2340 388 2366 C380 2386 396 2396 420 2396 L578 2396 C590 2390 592 2376 586 2360 C580 2320 578 2280 580 2230 C584 2120 590 2000 592 1900 C594 1840 592 1790 588 1760 C550 1772 500 1774 466 1760Z";
  const bootR = "M636 1760 C636 1800 638 1880 644 1980 C650 2100 656 2200 656 2290 C654 2330 652 2370 660 2390 C668 2396 700 2396 720 2396 L812 2396 C836 2394 840 2378 826 2362 C800 2336 772 2320 762 2290 C760 2200 762 2100 764 1980 C766 1880 764 1800 756 1756 C720 1770 670 1772 636 1760Z";
  const bootIn = (x0, x1, y0) => F(`M${x0 + 28} ${y0} C${x0 + 20} 1900 ${x0 + 24} 2100 ${x0 + 30} 2290 L${x0 + 46} 2290 C${x0 + 40} 2100 ${x0 + 38} 1900 ${x0 + 44} ${y0}Z`, "#8a8aa8", ` opacity="0.65"`) +
    F(`M${x0 + 30} ${y0 + 10} C${x0 + 26} 1880 ${x0 + 28} 1960 ${x0 + 32} 2040 L${x0 + 38} 2040 C${x0 + 34} 1960 ${x0 + 34} 1880 ${x0 + 38} ${y0 + 10}Z`, "#fff", ` opacity="0.6"`) +
    L(`M${x0 + 10} 2240 C${x0 + 40} 2256 ${x0 + 80} 2258 ${x1 - 10} 2244`, 2.5, "#3a3a4a") + L(`M${x0 + 10} 2270 C${x0 + 40} 2280 ${x0 + 80} 2282 ${x1 - 10} 2270`, 2, "#3a3a4a");
  const soles = F("M392 2386 L586 2386 L584 2398 L394 2398Z", "#050507") + F("M660 2386 L836 2386 L832 2398 L662 2398Z", "#050507");
  const tops = S("M462 1752 C500 1770 552 1770 592 1754 L594 1782 C552 1798 500 1798 460 1782Z", "#1e1e26", 3) + S("M634 1752 C672 1768 720 1768 758 1750 L760 1778 C720 1794 672 1794 634 1780Z", "#1e1e26", 3);
  return part(Lg, `url(#${P}pant)`, shL, 4.5) + part(Rg, `url(#${P}pant)`, shR, 4.5) +
    part(bootL, `url(#${P}boot)`, bootIn(452, 590, 1790) + F("M392 2350 C420 2340 450 2330 470 2320 L470 2340 C440 2350 420 2360 400 2370Z", "#fff", ` opacity="0.35"`), 4.5) +
    part(bootR, `url(#${P}boot)`, bootIn(642, 764, 1790) + F("M680 2340 C720 2340 760 2330 790 2340 L780 2350 C750 2346 720 2350 690 2352Z", "#fff", ` opacity="0.3"`), 4.5) +
    soles + tops + rimL("M762 1790 C766 1900 762 2100 764 2290 C780 2320 806 2340 826 2360", 4, 0.75);
}

// ── 칼집 ────────────────────────────────────────────
function scabbard() {
  const d = "M584 1130 L616 1130 L612 2310 C612 2330 588 2330 588 2310Z";
  const inner = F("M590 1130 L598 1130 L596 2320 L590 2320Z", "#6a6680", ` opacity="0.8"`) + F("M592 1180 L596 1180 L595 2200 L592 2200Z", "#fff", ` opacity="0.5"`);
  const fit = (y0, h) => part(`M582 ${y0} L618 ${y0} L617 ${y0 + h} L583 ${y0 + h}Z`, `url(#${P}goldH)`, L(`M584 ${y0 + h / 2} L616 ${y0 + h / 2}`, 1.5, GD.d), 3);
  const chape = part("M586 2240 L614 2240 L612 2316 C610 2338 590 2338 588 2316Z", `url(#${P}goldH)`, L("M590 2280 L610 2280", 1.5, GD.d), 3);
  return part(d, `url(#${P}sheath)`, inner, 4) + fit(1130, 50) + fit(1600, 26) + chape;
}

// ── 몸통(제복 상의) ─────────────────────────────────
function torso() {
  const d = "M548 440 C500 460 446 470 420 500 C426 620 450 760 470 880 C478 940 476 1000 470 1060 C480 1100 500 1140 520 1160 C580 1172 620 1172 680 1160 C700 1140 720 1100 730 1060 C724 1000 722 940 730 880 C750 760 774 620 780 500 C754 470 700 460 652 440Z";
  const inner = F("M650 450 C700 470 750 480 780 500 C774 620 750 760 730 880 C722 940 724 1000 730 1060 C720 1100 700 1140 680 1160 L640 1166Z", UN.d, ` opacity="0.55"`) +
    // 더블 브레스트 앞여밈
    L("M600 470 C612 600 628 760 640 960", 3, UN.d) + L("M640 960 C644 1040 650 1100 660 1160", 3, UN.d) +
    F("M600 470 C612 600 628 760 640 960 L648 960 C636 760 620 600 608 470Z", UN.h, ` opacity="0.5"`) +
    // 가슴 근육·주름
    L("M470 720 C510 740 560 744 600 734", 2.5, UN.s) + L("M640 740 C680 748 720 740 752 720", 2.5, UN.d) +
    L("M486 900 C520 910 550 910 580 902", 2, UN.s) + L("M660 904 C690 912 716 910 736 900", 2, UN.d) +
    // 허리띠
    F("M462 960 C540 980 660 980 738 960 L736 1004 C660 1022 540 1022 464 1004Z", "#16161c") + L("M462 960 C540 980 660 980 738 960", 3) + L("M464 1004 C540 1022 660 1022 736 1004", 3) +
    L("M468 970 C540 988 660 988 734 970", 1.5, "#4a4a5a") +
    // 상의 아랫단(허리띠 아래)
    L("M540 1010 C534 1060 532 1110 536 1160", 2.5, UN.s) + L("M700 1004 C706 1060 704 1110 696 1156", 2.5, UN.d) +
    // 아래 주머니 덮개
    S("M486 1040 L572 1046 L570 1078 C540 1084 510 1082 488 1074Z", UN.b, 2.5) + S("M650 1046 L730 1040 L728 1074 C706 1082 676 1084 652 1078Z", UN.s, 2.5);
  // 단추 두 줄
  let b = "";
  for (let i = 0; i < 4; i++) { const y = 610 + i * 100; b += btn(560 + i * 3, y, 10) + btn(676 + i * 3, y + 4, 10); }
  const buckle = part("M578 952 L640 952 L640 1012 L578 1012Z", `url(#${P}goldH)`, F("M590 964 L628 964 L628 1000 L590 1000Z", "#16161c") + star(609, 982, 13), 3);
  return part(d, `url(#${P}uni)`, inner, 5) + b + buckle +
    btn(512, 1060, 7) + btn(690, 1060, 7) + rimL("M778 504 C772 620 750 760 732 880", 4, 0.6);
}
// 훈장·약장·명찰·장식끈
function medals() {
  // 약장 (화면 오른쪽 가슴)
  const cols = ["#b8323e", "#2a5aa8", "#e0c050", "#2e8a5a", "#f0f0f0", "#6a3a9a", "#d97a2a", "#1e3a6a", "#c84a5a", "#3a9ac8", "#d9c27a", "#8a1e2a"];
  let r = "";
  for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) {
    const x = 622 + c * 26 - row * 4, y = 610 + row * 18 + c * 1.5, col = cols[(row * 4 + c) % cols.length];
    r += `<rect x="${f(x)}" y="${f(y)}" width="24" height="15" fill="${col}" stroke="${INK}" stroke-width="1.6"/>` +
      `<rect x="${f(x + 9)}" y="${f(y)}" width="6" height="15" fill="#fff" opacity="0.35"/>` + `<rect x="${f(x)}" y="${f(y)}" width="24" height="4" fill="#fff" opacity="0.3"/>`;
  }
  // 매단 훈장
  const hang = (x, y, col, shape) => {
    let o = S(`M${x - 9} ${y} L${x + 9} ${y} L${x + 7} ${y + 36} L${x - 7} ${y + 36}Z`, col, 1.8) + F(`M${x - 3} ${y} L${x + 3} ${y} L${x + 2} ${y + 36} L${x - 2} ${y + 36}Z`, "#fff", ` opacity="0.4"`);
    if (shape === 0) o += star(x, y + 56, 20, `url(#${P}goldR)`) + `<circle cx="${x}" cy="${y + 56}" r="6" fill="#b8323e" stroke="${INK}" stroke-width="1.5"/>`;
    else if (shape === 1) o += `<circle cx="${x}" cy="${y + 56}" r="18" fill="url(#${P}goldR)" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y + 56}" r="11" fill="none" stroke="${GD.d}" stroke-width="2"/>` + star(x, y + 56, 8, GD.h);
    else o += S(`M${x} ${y + 34} L${x + 18} ${y + 54} L${x} ${y + 78} L${x - 18} ${y + 54}Z`, "#e8eef8", 2) + S(`M${x} ${y + 44} L${x + 9} ${y + 55} L${x} ${y + 68} L${x - 9} ${y + 55}Z`, "#2a5aa8", 1.5);
    return o + `<circle cx="${f(x - 6)}" cy="${y + 48}" r="3" fill="#fff" opacity="0.8"/>`;
  };
  const hm = hang(634, 670, "#b8323e", 0) + hang(672, 672, "#2a5aa8", 1) + hang(708, 674, "#e0c050", 2);
  // 명찰 + 지휘관 휘장 (화면 왼쪽 가슴)
  const tag = part("M480 690 L560 694 L559 716 L479 712Z", "#16161c", L("M488 703 L552 706", 3, GD.b), 2.5);
  const badge = S("M516 600 L540 620 L516 650 L492 620Z", `url(#${P}goldR)`, 2.5) + S("M516 612 L528 622 L516 638 L504 622Z", "#1e3a6a", 1.8) +
    L("M480 626 C490 616 500 614 506 620 M552 626 C542 616 532 614 526 620", 3, GD.b);
  // 장식끈(aiguillette): 화면 왼쪽 어깨에서 가슴 단추로
  const aig = (d) => L(d, 11, INK) + L(d, 7, `url(#${P}goldH)`) + L(d, 7, GD.d, ` stroke-dasharray="3 5" opacity="0.7"`);
  const cords = aig("M442 510 C450 600 480 680 556 700") + aig("M452 506 C470 580 500 640 560 610") + aig("M436 520 C440 640 470 760 562 812") +
    S("M552 690 L568 694 L566 726 L552 722Z", `url(#${P}goldH)`, 2) + `<circle cx="562" cy="812" r="8" fill="url(#${P}goldR)" stroke="${INK}" stroke-width="2"/>`;
  return r + hm + tag + badge + cords;
}
// 목 + 제복 스탠드 칼라
function neck() {
  const nk = S("M556 360 C558 400 554 430 546 452 C576 470 624 470 654 452 C646 430 642 400 644 360Z", `url(#${P}skin)`, 4) +
    F("M556 372 C574 410 626 410 644 372 L646 430 C620 444 580 444 554 430Z", SK.s, ` opacity="0.9"`) + L("M590 420 C596 432 604 432 610 420", 2, SK.d); // 목울대
  const col = "M538 430 C534 450 534 480 540 500 C580 516 620 516 660 500 C666 480 666 450 662 430 C624 448 576 448 538 430Z";
  const colIn = F("M626 442 L662 430 C666 450 666 480 660 500 L630 510Z", UN.d, ` opacity="0.6"`) +
    // 금색 떡갈잎 자수
    [0, 1, 2, 3].map((i) => S(leaf([548 + i * 12, 490 - i * 2], [556 + i * 12, 492 - i * 2], [566 + i * 12, 462 - i * 3], -6), GD.b, 1.4) + S(leaf([652 - i * 12, 490 - i * 2], [644 - i * 12, 492 - i * 2], [634 - i * 12, 462 - i * 3], 6), GD.s, 1.4)).join("") +
    L("M540 498 C580 514 620 514 660 498", 3, GD.b);
  return nk + part(col, `url(#${P}uni)`, colIn, 4);
}

// ── 팔 (두 손을 의장검 위로 모음) ─────────────────────
function arms() {
  // 화면 왼쪽 팔(그의 오른팔)
  const upL = "M440 500 C404 520 386 570 382 640 C378 720 380 800 392 870 C410 900 450 904 470 880 C470 800 474 720 480 640 C484 580 476 530 440 500Z";
  const foreL = "M392 860 C390 910 410 950 450 990 C490 1030 530 1060 566 1080 C584 1062 590 1036 584 1012 C550 990 510 960 482 920 C470 900 460 880 470 860 C446 846 414 846 392 860Z";
  const L1 = part(upL, `url(#${P}uni)`, F("M382 640 C378 720 380 800 392 870 L414 880 C408 800 408 720 414 640Z", UN.h, ` opacity="0.4"`) + L("M396 820 C412 836 436 840 458 832", 2.5, UN.d), 4.5) +
    part(foreL, `url(#${P}uni)`, F("M392 880 C410 940 480 1010 566 1080 L576 1068 C500 1010 440 950 404 880Z", UN.s, ` opacity="0.8"`) + L("M420 880 C430 900 444 912 462 916", 2.5, UN.d) + L("M470 960 C490 978 512 990 534 996", 2, UN.d) +
      // 금색 소매 띠
      L("M528 1002 C540 1030 548 1054 552 1072", 14, GD.s) + L("M528 1002 C540 1030 548 1054 552 1072", 6, GD.h, ` opacity="0.8"`) + L("M510 990 C522 1016 530 1040 534 1058", 5, GD.b), 4.5);
  // 화면 오른쪽 팔(그의 왼팔)
  const upR = "M760 500 C796 520 814 570 818 640 C822 720 820 800 808 870 C790 900 750 904 730 880 C730 800 726 720 720 640 C716 580 724 530 760 500Z";
  const foreR = "M808 860 C812 910 790 950 754 980 C716 1010 680 1030 648 1044 C630 1028 624 1004 630 980 C664 962 700 940 722 910 C732 892 740 876 730 860 C754 846 786 846 808 860Z";
  const R1 = part(upR, `url(#${P}uni)`, F("M818 640 C822 720 820 800 808 870 L786 880 C792 800 792 720 786 640Z", UN.d, ` opacity="0.6"`) + L("M804 820 C788 836 764 840 742 832", 2.5, UN.d), 4.5) +
    part(foreR, `url(#${P}uni)`, F("M808 880 C790 940 720 1000 648 1044 L640 1030 C710 990 770 940 796 880Z", UN.d, ` opacity="0.7"`) + L("M780 880 C770 900 756 912 738 916", 2.5, UN.d) +
      L("M680 974 C672 1000 664 1020 660 1040", 14, GD.s) + L("M680 974 C672 1000 664 1020 660 1040", 6, GD.h, ` opacity="0.7"`) + L("M700 962 C692 986 686 1004 682 1022", 5, GD.b), 4.5);
  return L1 + R1;
}

// ── 어깨에 걸친 외투 (앞쪽 자락) ───────────────────────
function coatFront() {
  // 화면 왼쪽 자락: 어깨를 덮고 팔 바깥으로 흘러내림
  const Lc = "M520 452 C470 456 410 470 372 500 C340 540 330 600 334 680 C336 780 330 900 318 1040 C300 1300 280 1600 254 2060 C300 2072 340 2078 380 2080 C392 1800 400 1500 404 1240 C406 1080 400 960 392 860 C380 760 382 640 410 560 C440 510 480 476 520 452Z";
  const LcIn = F("M334 680 C336 780 330 900 318 1040 C300 1300 280 1600 254 2060 L300 2072 C320 1600 340 1300 356 1040 C366 900 366 780 360 680Z", CO.h, ` opacity="0.35"`) +
    L("M350 1100 C340 1400 320 1700 300 2070", 3, CO.d) + L("M380 1300 C376 1550 372 1800 368 2078", 2.5, CO.d) + L("M330 1500 C326 1700 316 1900 306 2050", 2, CO.s) +
    F("M380 2080 C392 1800 400 1500 404 1240 L392 1240 C386 1500 376 1800 362 2078Z", LN.b);
  // 화면 오른쪽 자락: 바람에 살짝 젖혀 안감이 보임
  const Rc = "M680 452 C730 456 790 470 828 500 C860 540 870 600 868 680 C868 780 880 900 896 1040 C920 1240 950 1460 990 1640 C1010 1720 1040 1790 1046 1820 C1000 1840 940 1850 880 1846 C860 1700 840 1500 820 1300 C808 1160 806 1020 808 880 C820 760 818 640 790 560 C760 510 720 476 680 452Z";
  const RcIn = F("M868 680 C868 780 880 900 896 1040 C920 1240 950 1460 990 1640 C1010 1720 1040 1790 1046 1820 L1010 1830 C980 1700 940 1460 912 1240 C894 1060 884 880 868 680Z", CO.d, ` opacity="0.7"`) +
    L("M840 1000 C850 1200 870 1450 900 1700", 3, CO.d) + L("M870 1100 C890 1350 920 1580 960 1780", 2.5, CO.d) +
    F("M880 1846 C860 1700 840 1500 820 1300 L840 1300 C860 1500 890 1700 920 1844Z", LN.b) + L("M840 1300 C860 1500 890 1700 920 1844", 2, LN.h);
  // 외투 깃(넓은 라펠)
  const lapL = "M548 438 C520 444 480 456 452 476 C444 520 456 580 480 640 C490 600 500 560 520 530 C530 500 540 470 548 438Z";
  const lapR = "M652 438 C680 444 720 456 748 476 C756 520 744 580 720 640 C710 600 700 560 680 530 C670 500 660 470 652 438Z";
  // 견장(금색 술 장식)
  const ep = (cx, dir) => {
    const x0 = cx - 54, plate = `M${x0} 492 C${x0 + 30} 476 ${x0 + 80} 476 ${x0 + 108} 492 L${x0 + 104} 518 C${x0 + 76} 506 ${x0 + 32} 506 ${x0 + 4} 518Z`;
    let fr = "";
    for (let i = 0; i < 12; i++) { const x = x0 + 8 + i * 8.4, y = 512 + Math.sin((i / 11) * Math.PI) * -6; fr += L(`M${f(x)} ${f(y)} L${f(x + dir * 2)} ${f(y + 34)}`, 6, INK) + L(`M${f(x)} ${f(y)} L${f(x + dir * 2)} ${f(y + 34)}`, 3.5, i % 2 ? GD.b : GD.s); }
    return fr + part(plate, `url(#${P}gold)`, star(cx - 22, 496, 9, "#fff6d0") + star(cx, 494, 9, "#fff6d0") + star(cx + 22, 496, 9, "#fff6d0"), 3.5);
  };
  return part(Lc, `url(#${P}coat)`, LcIn, 5) + part(Rc, `url(#${P}coatR)`, RcIn, 5) +
    part(lapL, CO.h, F("M452 476 C444 520 456 580 480 640 L470 560Z", CO.s, ` opacity="0.6"`) + L("M470 488 C470 540 478 590 486 620", 2, GD.b), 3.5) +
    part(lapR, CO.s, F("M748 476 C756 520 744 580 720 640 L734 560Z", CO.d, ` opacity="0.6"`) + L("M730 488 C730 540 722 590 714 620", 2, GD.s), 3.5) +
    ep(418, -1) + ep(782, 1) +
    rimL("M868 690 C870 800 880 920 896 1040 C922 1260 956 1480 1000 1680", 5, 0.8) + rimL("M830 504 C860 540 868 600 868 660", 4, 0.8);
}

// ── 검 손잡이 + 포갠 두 손 ───────────────────────────
function hilt() {
  // 코등이(금색) — 손 아래로 보임
  const guard = part("M552 1118 C570 1110 586 1112 600 1116 C614 1112 630 1110 648 1118 C654 1126 650 1134 640 1134 C626 1130 612 1132 600 1136 C588 1132 574 1130 560 1134 C550 1134 546 1126 552 1118Z", `url(#${P}gold)`, F("M552 1120 L648 1120 L648 1124 L552 1124Z", "#fff", ` opacity="0.6"`), 3);
  const grip = S("M588 1030 L612 1030 L612 1116 L588 1116Z", "#1a1822", 3);
  const pommel = `<ellipse cx="600" cy="1016" rx="20" ry="16" fill="url(#${P}goldR)" stroke="${INK}" stroke-width="3"/>`;
  // 아래 손(그의 오른손): 손잡이를 감싸 쥠
  const backR = S("M548 1050 C536 1066 534 1096 546 1116 C560 1128 580 1126 594 1116 C600 1092 598 1066 590 1050 C576 1040 560 1040 548 1050Z", GL.b, 4) +
    F("M546 1100 C556 1120 580 1124 594 1116 C580 1110 560 1106 546 1100Z", GL.s);
  const fR = fing([[584, 1062], [612, 1062], [620, 1074]], 15) + fing([[588, 1078], [616, 1080], [622, 1092]], 15) +
    fing([[588, 1094], [614, 1096], [620, 1108]], 14.5) + fing([[586, 1110], [608, 1112], [614, 1122]], 13);
  const thR = fing([[566, 1052], [590, 1046], [606, 1050]], 15);
  // 위 손(그의 왼손): 손잡이 머리 위에 덮어 얹음
  const backLh = S("M612 996 C634 986 660 990 668 1010 C672 1030 664 1050 648 1058 C630 1062 610 1056 600 1044 C596 1026 600 1006 612 996Z", GL.b, 4) +
    F("M668 1010 C672 1030 664 1050 648 1058 C656 1040 660 1024 668 1010Z", GL.s) + L("M620 1004 C636 998 652 1000 660 1008", 2, GL.d);
  const fL = fing([[612, 1008], [588, 1012], [574, 1032], [574, 1046]], 15) + fing([[614, 1024], [590, 1030], [580, 1052], [582, 1064]], 15.5) +
    fing([[618, 1040], [598, 1048], [592, 1068], [596, 1078]], 15) + fing([[626, 1052], [610, 1062], [608, 1080]], 13);
  const thL = fing([[652, 1054], [640, 1074], [622, 1084]], 15);
  const seams = L("M556 1060 C564 1056 574 1056 580 1060", 1.5, GL.d) + L("M630 1000 L634 1036 M644 998 L648 1034", 1.5, GL.d);
  return grip + guard + pommel + backR + thR + fR + backLh + fL + thL + seams;
}

// ── 머리 ────────────────────────────────────────────
function head() {
  const face = "M506 250 C504 316 510 350 524 376 C540 400 566 416 600 420 C634 416 660 400 676 376 C690 350 696 316 694 250 C694 168 652 130 600 130 C548 130 506 168 506 250Z";
  const earL = S("M508 280 C490 268 482 286 486 308 C490 330 500 346 516 348Z", `url(#${P}skin)`, 3.5) + L("M498 296 C496 310 502 324 510 332", 2, SK.d);
  const earR = S("M692 280 C710 268 718 286 714 308 C710 330 700 346 684 348Z", SK.s, 3.5) + L("M702 296 C704 310 698 324 690 332", 2, SK.d);
  const shade = F("M676 230 C690 300 690 350 676 376 C660 400 634 416 600 420 C640 396 664 360 670 300Z", SK.s, ` opacity="0.75"`) +
    F("M540 404 C570 420 630 420 660 404 C640 416 620 422 600 422 C580 422 560 416 540 404Z", SK.d, ` opacity="0.5"`) +
    // 각진 턱선 그늘 + 광대
    L("M524 376 C540 396 560 408 580 414", 2, SK.d, ` opacity="0.6"`) + F("M640 330 C660 320 676 320 690 330 C680 350 664 360 646 360Z", SK.s, ` opacity="0.6"`) +
    // 이마 주름
    L("M550 190 C580 184 620 184 650 190", 2, SK.d, ` opacity="0.7"`) + L("M560 204 C586 200 614 200 640 204", 1.8, SK.d, ` opacity="0.55"`) +
    // 팔자 주름
    L("M564 344 C556 356 555 366 558 374", 2, SK.d, ` opacity="0.7"`) + L("M636 344 C644 356 645 366 642 374", 2, SK.d, ` opacity="0.7"`) +
    // 수염 자국
    F("M540 380 C560 404 640 404 660 380 C650 410 630 420 600 422 C570 420 550 410 540 380Z", "#8a8aa0", ` opacity="0.18"`);
  return earL + earR + part(face, `url(#${P}skin)`, shade, 4.5);
}
const EXP = {
  normal: { o: 0.6, to: -7, ti: 8, iris: 0.76 },
  smile: { o: 0.5, to: -4, ti: 7, iris: 0.76, low: 0.7 },
  angry: { o: 0.66, to: -10, ti: 13, iris: 0.66 },
  sad: { o: 0.56, to: 2, ti: 0, iris: 0.78, look: 4 },
  surprise: { o: 1.0, to: -2, ti: 2, iris: 0.6 },
  serious: { o: 0.48, to: -8, ti: 10, iris: 0.78 },
};
function eye(e, side) {
  const o = e.o, ol = e.low || 1;
  const up = `M-32 ${4 + e.to} C-22 ${f(-18 * o + e.to * 0.5)} 12 ${f(-24 * o + e.ti * 0.5)} 30 ${-6 + e.ti}`;
  const low = `C24 ${f(10 * ol)} -12 ${f(14 * ol)} -30 ${8 + e.to * 0.3}Z`;
  const scl = up + " " + low;
  const id = `${P}e${side}${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  const r = e.iris, irx = 15 * r, iry = 19 * r, icx = 4, icy = 1 + (e.look || 0);
  const iris = `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="${INK}" stroke-width="2"/>` +
    `<ellipse cx="${icx}" cy="${f(icy + 1)}" rx="${f(irx * 0.42)}" ry="${f(iry * 0.46)}" fill="#07080c"/>` +
    `<path d="M${f(icx - irx * 0.8)} ${f(icy + iry * 0.35)} Q${icx} ${f(icy + iry * 1.05)} ${f(icx + irx * 0.8)} ${f(icy + iry * 0.35)}" fill="none" stroke="#b8c8e0" stroke-width="2" opacity="0.6"/>` +
    `<circle cx="${f(icx - irx * 0.42)}" cy="${f(icy - iry * 0.3)}" r="${f(4.2 * r + 0.8)}" fill="#fff"/><circle cx="${f(icx + irx * 0.5)}" cy="${f(icy + iry * 0.4)}" r="2" fill="#fff" opacity="0.9"/>`;
  const sclera = F(scl, "#fbf8f4") + `<g clip-path="url(#${id})">${F(`M-40 -40 L40 -40 L40 ${f(-8 * o)} C10 ${f(-2 * o)} -10 ${f(-2 * o)} -40 ${f(-4 * o)}Z`, "#d8d2dc")}${iris}</g>`;
  const lash = `<path d="${up}" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    L(`M-32 ${4 + e.to} L-38 ${f(6 + e.to)}`, 3) +
    L(`M28 ${f(4 * ol)} C12 ${f(12 * ol)} -12 ${f(13 * ol)} -26 ${f(8 + e.to * 0.3)}`, 2, "#5a4048") +
    L(`M-22 ${f(-22 * o + e.to * 0.5 - 6)} C-8 ${f(-28 * o - 4)} 12 ${f(-28 * o + e.ti * 0.5 - 4)} 24 ${f(-16 * o + e.ti - 6)}`, 2, "#8a5a56", ` opacity="0.8"`) +
    // 눈가 주름(까마귀발)
    L("M-40 2 L-50 -2 M-40 8 L-50 10", 1.6, SK.d, ` opacity="0.8"`) + L(`M-20 ${f(18 * ol)} C-8 ${f(22 * ol)} 6 ${f(22 * ol)} 14 ${f(18 * ol)}`, 1.4, SK.d, ` opacity="0.45"`);
  return sclera + lash;
}
function brows(x) {
  const B = {
    normal: "M-44 -2 C-26 -12 0 -12 30 -2 L30 6 C0 -2 -26 -2 -44 6Z",
    smile: "M-44 -4 C-26 -14 0 -14 30 -4 L30 4 C0 -4 -26 -4 -44 4Z",
    angry: "M-44 -14 C-22 -14 4 -6 30 10 L28 18 C4 4 -22 -4 -44 -4Z",
    sad: "M-44 4 C-24 -2 4 -10 30 -16 L30 -8 C4 -2 -24 6 -44 12Z",
    surprise: "M-44 -14 C-26 -26 0 -26 30 -16 L30 -8 C0 -16 -26 -16 -44 -6Z",
    serious: "M-44 -6 C-24 -10 4 -6 30 4 L30 12 C4 4 -24 2 -44 4Z",
  }[x];
  return S(B, "#2a2830", 2.5) + L(B.split("L")[0], 2, HR.grayS, ` opacity="0.6"`);
}
function mouth(x) {
  switch (x) {
    case "smile": return L("M578 382 C596 384 614 380 626 370", 3.2) + L("M626 370 L630 366", 2.5); // 한쪽만 올라간 냉소
    case "angry": return S("M572 382 C584 368 616 368 628 382 C616 392 584 392 572 382Z", "#4a1a22", 2.5) + F("M578 377 C590 372 610 372 622 377 L620 381 C608 378 592 378 580 381Z", "#f4f0e8") + F("M582 386 C592 389 608 389 618 386 L618 383 C608 385 592 385 582 383Z", "#f4f0e8");
    case "sad": return L("M580 384 C592 378 608 378 620 384", 3);
    case "surprise": return S("M586 374 C588 364 612 364 614 374 C614 390 608 396 600 396 C592 396 586 390 586 374Z", "#4a1a22", 2.5);
    case "serious": return L("M578 380 L622 380", 3.4) + L("M582 386 L618 386", 1.6, SK.d, ` opacity="0.6"`);
    default: return L("M580 380 C594 383 606 383 620 380", 3.2) + L("M584 388 C594 390 606 390 616 388", 1.6, SK.d, ` opacity="0.6"`);
  }
}
function face(x) {
  const e = EXP[x];
  const eL = `<g transform="translate(554 292)">${eye(e, "L")}</g>`;
  const eR = `<g transform="translate(646 292) scale(-1 1)">${eye(e, "R")}</g>`;
  const bL = `<g transform="translate(552 262)">${brows(x)}</g>`, bR = `<g transform="translate(648 262) scale(-1 1)">${brows(x)}</g>`;
  const nose = L("M604 300 C606 320 610 336 608 346", 2.2, SK.d) + L("M590 352 C596 356 604 356 612 350", 2.5, SK.d) + F("M608 320 C618 340 616 350 606 354Z", SK.s, ` opacity="0.8"`);
  let fx = "";
  if (x === "angry") fx = L("M594 262 L598 278 M606 262 L602 278", 2, SK.d) + L("M700 180 l14 -14 M708 192 l18 -6", 3.5, "#c83a4a");
  if (x === "surprise") fx = F("M708 210 C712 226 712 236 706 242 C700 236 700 226 708 210Z", "#bfe8ff", ` stroke="${INK}" stroke-width="2"`);
  if (x === "sad") fx = L("M520 340 C530 344 540 344 548 340", 1.5, SK.d, ` opacity="0.5"`);
  return eL + eR + bL + bR + nose + mouth(x) + fx;
}
// 뒤로 빗어 넘긴 머리 + 희끗한 관자놀이
function hair() {
  const ds = [
    "M504 262 C494 196 506 140 546 114 C580 94 636 92 670 112 C706 136 712 196 698 262 C694 236 688 216 676 202 C656 194 634 192 616 196 C608 190 600 186 594 192 C572 190 550 192 528 202 C516 216 508 236 504 262Z",
  ];
  const sweep = [[520, 214, 540, 140, 600, 110], [548, 200, 566, 140, 620, 108], [574, 194, 590, 140, 640, 110], [610, 196, 630, 140, 668, 120], [644, 196, 670, 150, 690, 140], [676, 206, 696, 170, 700, 160]];
  const sh = sweep.map(([x0, y0, x1, y1, x2, y2]) => L(`M${x0} ${y0} Q${x1} ${y1} ${x2} ${y2}`, 2.4, HR.d)).join("") +
    F("M560 100 C620 90 670 104 690 130 C700 150 704 170 704 200 L690 210 C680 170 660 140 620 124Z", HR.d, ` opacity="0.45"`) +
    // 윤기 (뒤로 넘긴 결을 따라)
    F("M532 180 C540 150 566 128 600 122 C570 136 552 158 546 184Z", HR.g, ` opacity="0.7"`) + F("M572 170 C584 140 610 126 640 124 C616 138 598 156 590 178Z", HR.g, ` opacity="0.6"`) +
    F("M612 172 C624 148 646 136 670 138 C652 150 638 164 632 180Z", HR.g, ` opacity="0.45"`) +
    L("M546 150 C560 132 580 124 600 122", 2, "#eef0fa", ` opacity="0.85"`) + L("M590 140 C604 130 620 126 638 126", 2, "#eef0fa", ` opacity="0.7"`) +
    // 관자놀이 흰머리
    F("M496 200 C500 240 500 270 502 300 L524 300 C518 260 518 230 532 196Z", HR.gray, ` opacity="0.95"`) +
    F("M706 200 C702 240 702 270 700 300 L678 300 C684 260 684 230 672 196Z", HR.grayS, ` opacity="0.95"`) +
    L("M506 214 L514 290 M516 206 L520 270", 1.6, "#eef0f6", ` opacity="0.85"`) + L("M690 214 L686 280", 1.6, "#d8dce6", ` opacity="0.7"`);
  // 짧은 옆머리(귀 위)
  const side = S("M500 230 C494 260 496 290 504 304 C508 286 512 270 520 254 C512 246 506 238 500 230Z", HR.gray, 3) +
    S("M700 230 C706 260 704 290 696 304 C692 286 688 270 680 254 C688 246 694 238 700 230Z", HR.grayS, 3);
  return union(ds, `url(#${P}hair)`, sh, 4.5) + side + L("M600 192 C592 214 590 230 596 244", 2.5, INK) + L("M604 192 C600 208 600 220 604 232", 1.8, HR.h) + // 앞으로 흘러내린 한 가닥(아들과 닮음)
    rimL("M700 256 C712 200 704 150 664 116", 4, 0.75);
}

export function svg(expr = "normal") {
  if (!EXP[expr]) expr = "normal";
  clipN = 0; clips.length = 0;
  const body = coatBack() + legs() + scabbard() + torso() + medals() + neck() + arms() + coatFront() + hilt() +
    head() + face(expr) + hair();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${body}</svg>`;
}
