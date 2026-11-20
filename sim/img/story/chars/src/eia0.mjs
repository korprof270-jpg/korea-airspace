// EIA (초기) — 아직 선했던 방위 AI의 홀로그램 (「에이아 연대기」 전신 입간판, viewBox 0 0 1200 2400)
// 필터 없이 반투명 도형을 겹쳐 빛을 표현한다: 남색 그림자선 → 넓은 하늘색 번짐 → 얇은 흰 심선
export const ID = "eia0", NAME = "EIA";

const P = "eia0-";
const C = "#7fd8ff", CW = "#effcff", CL = "#bdeeff", CD = "#3a9ad8", CN = "#0d3a66", FEAT = "#15558f";

// ── 도구 ────────────────────────────────────────────
const f = (n) => Math.round(n * 10) / 10;
const F = (d, fill, ex = "") => `<path d="${d}" fill="${fill}"${ex}/>`;
const L = (d, sw = 2.5, col = CW, ex = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${ex}/>`;
// 빛나는 선: 바깥 남색(밝은 배경에서도 윤곽 유지) + 번짐 2겹 + 심선
const G = (d, w = 3, core = CW) => L(d, w + 9, CN, ` opacity="0.22"`) + L(d, w + 12, C, ` opacity="0.14"`) + L(d, w + 5, C, ` opacity="0.35"`) + L(d, w, core);
const g2 = (d, w = 2) => L(d, w + 5, C, ` opacity="0.3"`) + L(d, w, CW, ` opacity="0.95"`); // 안쪽 세부선
let clipN = 0, clips = [];
function clipG(ds, inner) {
  const id = `${P}c${clipN++}`;
  clips.push(`<clipPath id="${id}">${ds.map((d) => `<path d="${d}"/>`).join("")}</clipPath>`);
  return `<g clip-path="url(#${id})">${inner}</g>`;
}
// 반투명 면 + 내부 음영 + 빛 윤곽
function holo(d, fill, inner = "", w = 3) { return F(d, fill) + (inner ? clipG([d], inner) : "") + G(d, w); }
function leaf(b1, b2, t, k = 0, k2 = k) {
  const mx = (b1[0] + b2[0]) / 2, my = (b1[1] + b2[1]) / 2;
  const dx = t[0] - mx, dy = t[1] - my, l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  const c1 = [(b1[0] + t[0]) / 2 + nx * k, (b1[1] + t[1]) / 2 + ny * k];
  const c2 = [(b2[0] + t[0]) / 2 + nx * k2, (b2[1] + t[1]) / 2 + ny * k2];
  return `M${f(b1[0])} ${f(b1[1])} Q${f(c1[0])} ${f(c1[1])} ${f(t[0])} ${f(t[1])} Q${f(c2[0])} ${f(c2[1])} ${f(b2[0])} ${f(b2[1])}Z`;
}
// 빛 손가락: 넓은 번짐 + 반투명 몸 + 심선
function fing(pts, w) {
  const d = "M" + pts.map((p) => p.join(" ")).join(" L");
  return L(d, w + 12, C, ` opacity="0.2"`) + L(d, w + 4, CW, ` opacity="0.9"`) + L(d, w, "#cdf2ff", ` opacity="0.95"`) + L(d, w * 0.3, "#ffffff");
}
// 결정적 의사난수
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ── 그라데이션 ──────────────────────────────────────
const defs = () => `
<linearGradient id="${P}hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CW}" stop-opacity="0.7"/><stop offset="0.35" stop-color="${C}" stop-opacity="0.45"/><stop offset="1" stop-color="${CD}" stop-opacity="0.08"/></linearGradient>
<linearGradient id="${P}hairF" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/><stop offset="0.5" stop-color="${CL}" stop-opacity="0.6"/><stop offset="1" stop-color="${C}" stop-opacity="0.25"/></linearGradient>
<linearGradient id="${P}skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.96"/><stop offset="0.6" stop-color="#e6f9ff" stop-opacity="0.9"/><stop offset="1" stop-color="${CL}" stop-opacity="0.82"/></linearGradient>
<linearGradient id="${P}suit" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stop-color="${CL}" stop-opacity="0.6"/><stop offset="0.45" stop-color="#4fb4ec" stop-opacity="0.5"/><stop offset="1" stop-color="#1f6fb0" stop-opacity="0.6"/></linearGradient>
<linearGradient id="${P}leg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb4ec" stop-opacity="0.55"/><stop offset="0.7" stop-color="#3a9ad8" stop-opacity="0.4"/><stop offset="1" stop-color="${CW}" stop-opacity="0.6"/></linearGradient>
<linearGradient id="${P}trail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CL}" stop-opacity="0.45"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></linearGradient>
<linearGradient id="${P}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${C}" stop-opacity="0.45"/><stop offset="0.4" stop-color="${C}" stop-opacity="0.12"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></linearGradient>
<radialGradient id="${P}glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${C}" stop-opacity="0.55"/><stop offset="0.6" stop-color="${C}" stop-opacity="0.15"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}orb" cx="0.4" cy="0.4" r="0.6"><stop offset="0" stop-color="#ffffff"/><stop offset="0.4" stop-color="${CW}"/><stop offset="1" stop-color="${C}" stop-opacity="0.3"/></radialGradient>
<radialGradient id="${P}iris" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#9fe6ff"/><stop offset="0.8" stop-color="#2a8ad0"/><stop offset="1" stop-color="#0d4a80"/></radialGradient>
<pattern id="${P}scan" width="10" height="9" patternUnits="userSpaceOnUse"><rect width="10" height="1.6" fill="#ffffff" opacity="0.14"/></pattern>`;

// ── 뒤 배경: 후광 고리 ──────────────────────────────
function halo() {
  const cx = 600, cy = 360;
  let o = `<circle cx="${cx}" cy="${cy}" r="330" fill="url(#${P}glow)" opacity="0.7"/>`;
  const ring = (r, w, op, dash = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C}" stroke-width="${w + 8}" opacity="${f(op * 0.25)}"${dash}/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CW}" stroke-width="${w}" opacity="${op}"${dash}/>`;
  o += ring(176, 3, 0.85) + ring(198, 1.5, 0.6, ` stroke-dasharray="4 10"`) + ring(236, 5, 0.55, ` stroke-dasharray="120 22 30 22"`) +
    ring(282, 2, 0.5) + ring(300, 8, 0.25, ` stroke-dasharray="2 14"`) + ring(340, 1.5, 0.35, ` stroke-dasharray="60 30"`);
  // 눈금
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, r0 = 250, r1 = i % 4 ? 262 : 274;
    o += L(`M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)} L${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}`, i % 4 ? 1.5 : 3, CW, ` opacity="0.6"`);
  }
  // 고리 위 마름모 노드
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2, x = cx + Math.cos(a) * 282, y = cy + Math.sin(a) * 282;
    o += F(`M${f(x)} ${f(y - 12)} L${f(x + 8)} ${f(y)} L${f(x)} ${f(y + 12)} L${f(x - 8)} ${f(y)}Z`, CW, ` opacity="0.85"`) + `<circle cx="${f(x)}" cy="${f(y)}" r="18" fill="url(#${P}glow)"/>`;
  }
  // 바깥 호 조각
  o += L(`M${cx - 380} ${cy + 60} A384 384 0 0 1 ${cx - 200} ${cy - 330}`, 3, CW, ` opacity="0.45"`) + L(`M${cx + 380} ${cy + 60} A384 384 0 0 0 ${cx + 200} ${cy - 330}`, 3, CW, ` opacity="0.45"`);
  return o;
}
// ── 투영 원반 + 빛기둥 ──────────────────────────────
function disc(front) {
  const cx = 600, cy = 2340;
  if (!front) {
    return F(`M${cx - 250} ${cy} L${cx - 150} 900 L${cx + 150} 900 L${cx + 250} ${cy}Z`, `url(#${P}beam)`) +
      `<ellipse cx="${cx}" cy="${cy}" rx="300" ry="62" fill="url(#${P}glow)"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="250" ry="48" fill="${CN}" opacity="0.35"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="250" ry="48" fill="none" stroke="${C}" stroke-width="14" opacity="0.25"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="250" ry="48" fill="none" stroke="${CW}" stroke-width="3"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="200" ry="36" fill="none" stroke="${CW}" stroke-width="1.5" stroke-dasharray="10 8" opacity="0.8"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="140" ry="24" fill="${C}" opacity="0.25"/>`;
  }
  // 앞쪽 테두리(발 앞을 지나가는 반원) + 받침 측면
  return L(`M${cx - 250} ${cy} A250 48 0 0 0 ${cx + 250} ${cy}`, 16, C, ` opacity="0.25"`) + L(`M${cx - 250} ${cy} A250 48 0 0 0 ${cx + 250} ${cy}`, 3.5, CW) +
    F(`M${cx - 250} ${cy} A250 48 0 0 0 ${cx + 250} ${cy} L${cx + 240} ${cy + 18} A240 46 0 0 1 ${cx - 240} ${cy + 18}Z`, CD, ` opacity="0.45"`) +
    L(`M${cx - 240} ${cy + 18} A240 46 0 0 0 ${cx + 240} ${cy + 18}`, 2, CW, ` opacity="0.7"`) +
    [-180, -90, 0, 90, 180].map((x) => `<circle cx="${cx + x}" cy="${f(cy + 46 * Math.sqrt(1 - (x / 250) ** 2) + 8)}" r="4" fill="#fff"/>`).join("");
}
// 빛 입자
function particles() {
  seed = 11;
  let o = "";
  for (let i = 0; i < 70; i++) {
    const x = 160 + rnd() * 880, y = 160 + rnd() * 2150, r = 1.5 + rnd() * 4.5, k = rnd();
    // 몸 중심부는 비워 둔다
    if (Math.abs(x - 600) < 150 && y > 300 && y < 2300 && k < 0.7) continue;
    if (k < 0.25) o += F(`M${f(x)} ${f(y - r * 2.2)} L${f(x + r)} ${f(y)} L${f(x)} ${f(y + r * 2.2)} L${f(x - r)} ${f(y)}Z`, CW, ` opacity="${f(0.5 + rnd() * 0.5)}"`);
    else o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.6)}" fill="${C}" opacity="0.15"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${CW}" opacity="${f(0.5 + rnd() * 0.5)}"/>`;
  }
  // 위로 올라가는 짧은 빛줄기
  for (let i = 0; i < 14; i++) { const x = 380 + rnd() * 440, y = 1700 + rnd() * 560, h = 30 + rnd() * 70; o += L(`M${f(x)} ${f(y)} L${f(x)} ${f(y - h)}`, 2, CW, ` opacity="${f(0.25 + rnd() * 0.4)}"`); }
  return o;
}

// ── 몸 부품 경로 ────────────────────────────────────
const B = {
  torso: "M560 440 C530 452 494 462 478 486 C480 560 492 630 508 700 C522 770 546 820 550 860 C540 920 500 990 490 1060 C530 1104 670 1104 710 1060 C700 990 660 920 650 860 C654 820 678 770 692 700 C708 630 720 560 722 486 C706 462 670 452 640 440Z",
  legL: "M492 1050 C484 1250 504 1450 530 1650 C540 1800 548 1950 556 2100 C560 2200 562 2260 566 2310 L604 2312 C604 2250 602 2180 600 2100 C598 1950 600 1800 600 1650 C600 1450 604 1250 600 1080Z",
  legR: "M600 1080 C606 1250 620 1450 640 1640 C652 1760 652 1880 640 2000 C632 2100 626 2200 628 2290 L664 2296 C670 2200 680 2100 690 2000 C702 1880 704 1760 700 1640 C700 1450 706 1250 708 1050Z",
  footL: "M564 2300 C560 2330 566 2358 580 2376 C590 2388 604 2384 606 2370 C608 2350 606 2326 604 2304Z",
  footR: "M628 2284 C628 2314 634 2342 648 2362 C658 2374 672 2370 672 2354 C672 2332 668 2310 664 2290Z",
  upL: "M486 482 C462 492 446 520 442 560 C436 640 434 720 440 800 C452 816 474 818 486 806 C488 730 492 650 500 580 C506 540 508 500 486 482Z",
  foreL: "M440 796 C436 860 440 940 452 1020 C454 1040 456 1054 460 1066 L490 1064 C490 1040 488 1020 488 1000 C486 940 486 870 486 806Z",
  upR: "M714 482 C740 492 756 520 762 560 C770 640 776 720 778 788 C766 808 744 810 730 798 C726 720 720 650 710 580 C704 540 700 500 714 482Z",
  foreR: "M730 792 C744 814 772 814 786 802 C818 790 846 776 872 764 L862 730 C836 742 808 754 780 762 C760 768 742 778 730 792Z",
  neck: "M572 380 C574 410 570 432 562 448 C584 462 616 462 638 448 C630 432 626 410 628 380Z",
  face: "M502 250 C500 318 518 362 548 392 C570 410 588 420 600 421 C612 420 630 410 652 392 C682 362 700 318 698 250 C698 160 655 128 600 128 C545 128 502 160 502 250Z",
};

// ── 뒷머리: 무중력처럼 퍼지는 빛의 머리카락 ─────────────
function hairBack() {
  const d = "M480 260 C460 180 516 104 600 100 C684 104 740 180 720 260 C730 330 748 400 776 470 C808 560 830 650 822 750 C816 830 790 910 800 990 C810 1070 850 1130 900 1176 C836 1180 782 1140 748 1076 C724 1030 706 970 694 900 L506 900 C488 990 466 1070 424 1150 C384 1226 322 1296 236 1340 C290 1268 320 1196 330 1116 C340 1036 320 956 332 872 C344 782 384 702 404 612 C426 520 458 400 480 260Z";
  let strands = "";
  const paths = [
    "M560 160 C500 300 440 520 400 700 C370 840 360 980 330 1110 C310 1200 280 1270 240 1336",
    "M580 170 C540 330 480 560 440 740 C410 880 410 1000 390 1110",
    "M540 200 C480 360 430 560 380 720 C350 820 340 900 340 980",
    "M520 240 C470 400 420 600 360 780",
    "M640 160 C700 320 760 500 790 640 C810 760 790 860 790 960 C796 1060 840 1130 896 1172",
    "M660 190 C720 360 770 540 780 700 C786 820 760 900 770 1000",
    "M680 230 C730 380 770 520 800 660",
    "M600 140 C580 400 540 640 500 890",
  ];
  paths.forEach((pp, i) => { strands += g2(pp, i < 2 || i == 4 ? 2.2 : 1.4); });
  return F(d, `url(#${P}hair)`) + clipG([d], `<rect x="0" y="0" width="1200" height="1400" fill="url(#${P}scan)"/>` +
    F("M600 120 C560 300 520 600 500 900 L700 900 C680 600 640 300 600 120Z", CN, ` opacity="0.22"`)) +
    L(d, 12, C, ` opacity="0.18"`) + L(d, 3, CW, ` opacity="0.85"`) + strands;
}
// 허리에서 흘러내리는 빛의 자락(뒤)
function trails() {
  // 허리 양옆에서 S자로 흐르는 빛 리본
  const rib = (pts, w0) => {
    // 중심선 점들을 따라 점점 가늘어지는 리본
    const l = [], r = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      const dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, w = w0 * (1 - i / pts.length * 0.85);
      l.push([f(p[0] - dy / n * w), f(p[1] + dx / n * w)]); r.push([f(p[0] + dy / n * w), f(p[1] - dx / n * w)]);
    }
    return "M" + l.map((q) => q.join(" ")).join(" L") + " L" + r.reverse().map((q) => q.join(" ")).join(" L") + "Z";
  };
  const A = rib([[540, 900], [510, 1020], [470, 1160], [440, 1300], [440, 1420], [410, 1540], [360, 1660], [320, 1780], [300, 1880]], 26);
  const Bb = rib([[660, 900], [690, 1010], [740, 1130], [790, 1240], [800, 1360], [780, 1480], [800, 1600], [850, 1700], [880, 1760]], 24);
  return [A, Bb].map((d) => F(d, `url(#${P}trail)`) + L(d, 8, C, ` opacity="0.15"`) + L(d, 2, CW, ` opacity="0.7"`)).join("");
}
// ── 몸통·다리: 몸에 맞는 빛의 수트 + 회로선 ───────────────
function body() {
  const node = (x, y, r = 5) => `<circle cx="${x}" cy="${y}" r="${r + 6}" fill="${C}" opacity="0.3"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${CW}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`;
  const legIn = (d) => clipG([d], `<rect x="400" y="1000" width="400" height="1400" fill="url(#${P}scan)"/>`);
  const legs = holo(B.legL, `url(#${P}leg)`, F("M570 1080 C580 1400 586 1800 590 2310 L604 2312 C604 2250 600 1950 600 1650 C600 1450 604 1250 600 1080Z", CN, ` opacity="0.2"`)) + legIn(B.legL) +
    holo(B.legR, `url(#${P}leg)`, F("M670 1060 C680 1300 690 1600 696 1800 C694 1900 688 2000 680 2100 L664 2296 L690 2000 C702 1880 704 1760 700 1640 C696 1450 694 1250 694 1050Z", CN, ` opacity="0.22"`)) + legIn(B.legR) +
    // 다리 회로선
    g2("M540 1200 L548 1500 L566 1560 L570 1900", 1.8) + node(566, 1560) + g2("M660 1180 L668 1460 L682 1520 L680 1760", 1.8) + node(682, 1520) +
    g2("M532 1680 C552 1696 580 1698 598 1690", 2) + g2("M650 1660 C668 1674 690 1676 702 1668", 2) + // 무릎선
    g2("M560 2140 L600 2140 M632 2120 L672 2124", 2) +
    holo(B.footL, `url(#${P}skin)`, "", 2.5) + holo(B.footR, `url(#${P}skin)`, "", 2.5);
  const torsoIn = F("M640 450 C680 462 710 470 722 486 C720 560 704 640 686 720 C674 780 662 820 658 860 C666 920 688 990 696 1060 L650 1080Z", CN, ` opacity="0.2"`) +
    `<rect x="400" y="400" width="400" height="720" fill="url(#${P}scan)"/>` +
    F("M500 500 C520 480 560 470 590 476 C560 500 530 540 512 600Z", "#fff", ` opacity="0.35"`);
  const torso = holo(B.torso, `url(#${P}suit)`, torsoIn) +
    // 가슴선(절제된 곡선) + 중앙 회로
    g2("M528 640 C550 670 584 674 598 660", 2) + g2("M602 660 C616 674 650 670 672 640", 2) +
    g2("M600 470 L600 560 L586 590 L586 760 L600 790 L600 1000 L600 1080", 2) + node(600, 560, 6) + node(600, 790, 6) +
    g2("M520 560 L556 590 L556 700 M680 560 L644 590 L644 700", 1.6) + node(556, 700, 4) + node(644, 700, 4) +
    // 허리띠(빛 고리)
    L("M546 868 C576 882 624 882 654 868", 10, C, ` opacity="0.35"`) + L("M546 868 C576 882 624 882 654 868", 3, CW) +
    F("M600 862 L614 878 L600 894 L586 878Z", "#fff") +
    g2("M520 960 C560 990 640 990 680 960", 1.6) + g2("M512 1010 L560 1040 M688 1010 L640 1040", 1.6) +
    // 어깨 장갑판(기하학 패널)
    holo("M488 476 C510 462 540 456 560 456 L548 500 C530 504 510 512 492 524Z", CW + "", "", 2).replace(`fill="${CW}"`, `fill="${CW}" fill-opacity="0.35"`) +
    holo("M712 476 C690 462 660 456 640 456 L652 500 C670 504 690 512 708 524Z", CW, "", 2).replace(`fill="${CW}"`, `fill="${CW}" fill-opacity="0.25"`);
  return legs + torso;
}
// ── 팔과 손 ─────────────────────────────────────────
function arms() {
  const sc = (d) => clipG([d], `<rect x="400" y="440" width="560" height="700" fill="url(#${P}scan)"/>`);
  // 화면 왼쪽 팔: 느슨하게 내려 손끝을 살짝 펼침
  const aL = holo(B.upL, `url(#${P}suit)`) + sc(B.upL) + holo(B.foreL, `url(#${P}suit)`) + sc(B.foreL) +
    g2("M462 520 L458 760 M448 840 L462 1040", 1.6) + L("M444 1030 C456 1040 476 1042 490 1036", 8, C, ` opacity="0.35"`) + L("M444 1030 C456 1040 476 1042 490 1036", 2.5, CW);
  const palmL = "M458 1060 C450 1080 450 1110 458 1130 C468 1140 484 1140 492 1128 C496 1108 494 1082 488 1062Z";
  const handL = holo(palmL, `url(#${P}skin)`, "", 2.5) +
    fing([[462, 1124], [458, 1160], [462, 1190]], 8) + fing([[472, 1132], [472, 1172], [478, 1204]], 8.5) +
    fing([[482, 1132], [486, 1170], [494, 1198]], 8.5) + fing([[490, 1124], [498, 1156], [508, 1178]], 7.5) + fing([[460, 1080], [446, 1104], [444, 1130]], 8.5);
  // 화면 오른쪽 팔: 옆으로 내밀어 손바닥 위에 빛 구슬
  const aR = holo(B.upR, `url(#${P}suit)`) + sc(B.upR) + holo(B.foreR, `url(#${P}suit)`) + sc(B.foreR) +
    g2("M736 520 L750 760", 1.6) + g2("M780 782 L850 752", 1.6) + L("M852 734 L864 764", 8, C, ` opacity="0.35"`) + L("M852 734 L864 764", 2.5, CW);
  const palmR = "M860 728 C878 720 904 718 922 724 C932 730 930 744 920 750 C902 758 880 762 866 764Z";
  const handR = holo(palmR, `url(#${P}skin)`, "", 2.5) +
    fing([[912, 730], [940, 724], [956, 712]], 8.5) + fing([[916, 740], [946, 738], [964, 728]], 8.5) + fing([[912, 750], [940, 752], [958, 746]], 8) +
    fing([[904, 756], [928, 762], [944, 760]], 7.5) + fing([[878, 726], [886, 708], [900, 698]], 8.5);
  // 빛 구슬
  const ox = 920, oy = 650;
  const orb = `<circle cx="${ox}" cy="${oy}" r="80" fill="url(#${P}glow)"/><circle cx="${ox}" cy="${oy}" r="26" fill="url(#${P}orb)"/>` +
    `<ellipse cx="${ox}" cy="${oy}" rx="46" ry="14" fill="none" stroke="${CW}" stroke-width="2" opacity="0.8" transform="rotate(-20 ${ox} ${oy})"/>` +
    `<ellipse cx="${ox}" cy="${oy}" rx="40" ry="12" fill="none" stroke="${C}" stroke-width="2" opacity="0.7" transform="rotate(30 ${ox} ${oy})"/>` +
    F(`M${ox} ${oy - 14} L${ox + 9} ${oy} L${ox} ${oy + 14} L${ox - 9} ${oy}Z`, "#fff") + L(`M${ox} ${oy + 30} L${ox - 4} ${oy + 66}`, 2, CW, ` opacity="0.5"`);
  return aL + handL + aR + handR + orb;
}
function neckHead() {
  const nk = holo(B.neck, `url(#${P}skin)`, F("M572 392 C584 416 616 416 628 392 L628 430 C612 440 588 440 572 430Z", C, ` opacity="0.35"`), 2.5);
  // 빛나는 초커
  const choker = L("M562 440 C584 454 616 454 638 440", 12, C, ` opacity="0.35"`) + L("M562 440 C584 454 616 454 638 440", 3.5, CW) + F("M600 446 L610 458 L600 470 L590 458Z", "#fff");
  const earL = holo("M504 282 C488 272 480 288 484 308 C488 330 498 344 512 346Z", `url(#${P}skin)`, "", 2.5);
  const earR = holo("M696 282 C712 272 720 288 716 308 C712 330 702 344 688 346Z", `url(#${P}skin)`, "", 2.5);
  const face = holo(B.face, `url(#${P}skin)`, F("M680 240 C690 300 684 350 652 392 C630 410 612 420 600 421 C640 400 670 360 676 300Z", C, ` opacity="0.35"`), 3);
  return nk + choker + earL + earR + face;
}
// ── 얼굴: 밝은 면 위에 짙은 청색 선으로 표정을 또렷하게 ─────────
const EXP = {
  normal: { o: 0.8, to: 4, ti: 0, iris: 1 },
  smile: { closed: true },
  angry: { o: 0.78, to: -4, ti: 8, iris: 0.86 },
  sad: { o: 0.8, to: 8, ti: -4, iris: 1, tear: true },
  surprise: { o: 1.18, to: 0, ti: 0, iris: 0.72 },
  serious: { o: 0.62, to: 2, ti: 3, iris: 1 },
};
function eye(e, side) {
  if (e.closed) return L("M-32 0 C-18 14 14 14 32 0", 8, C, ` opacity="0.4"`) + L("M-32 0 C-18 14 14 14 32 0", 4.5, FEAT) + L("M-32 0 L-42 -6", 3, FEAT) + L("M-26 -14 C-10 -22 10 -22 24 -16", 1.6, FEAT, ` opacity="0.5"`);
  const o = e.o;
  const up = `M-32 ${2 + e.to} C-24 ${f(-20 * o + e.to * 0.5)} 14 ${f(-26 * o + e.ti * 0.5)} 32 ${-4 + e.ti}`;
  const scl = up + ` C26 16 -14 20 -30 ${8 + e.to * 0.4}Z`;
  const id = `${P}e${side}${clipN++}`;
  clips.push(`<clipPath id="${id}"><path d="${scl}"/></clipPath>`);
  const r = e.iris, irx = 16 * r, iry = 21 * r, icx = 3, icy = 2;
  // 기계적인 홍채: 동심 고리 + 빛나는 동공
  const iris = `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx)}" ry="${f(iry)}" fill="url(#${P}iris)" stroke="${FEAT}" stroke-width="2"/>` +
    `<ellipse cx="${icx}" cy="${icy}" rx="${f(irx * 0.68)}" ry="${f(iry * 0.68)}" fill="none" stroke="#e8fbff" stroke-width="1.2" opacity="0.8"/>` +
    `<ellipse cx="${icx}" cy="${f(icy + 1)}" rx="${f(irx * 0.36)}" ry="${f(iry * 0.4)}" fill="${FEAT}"/><ellipse cx="${icx}" cy="${f(icy + 1)}" rx="${f(irx * 0.16)}" ry="${f(iry * 0.18)}" fill="#bff0ff"/>` +
    `<circle cx="${f(icx - irx * 0.42)}" cy="${f(icy - iry * 0.38)}" r="${f(5.5 * r + 1)}" fill="#fff"/><circle cx="${f(icx + irx * 0.5)}" cy="${f(icy + iry * 0.42)}" r="2.6" fill="#fff"/><circle cx="${f(icx + irx * 0.6)}" cy="${f(icy - iry * 0.2)}" r="1.6" fill="#fff"/>`;
  const sclera = F(scl, "#ffffff") + `<g clip-path="url(#${id})">${F(`M-40 -40 L40 -40 L40 ${f(-10 * o)} C10 ${f(-4 * o)} -10 ${f(-4 * o)} -40 ${f(-6 * o)}Z`, "#cfeeff")}${iris}</g>`;
  const lash = `<path d="${up}" fill="none" stroke="${C}" stroke-width="12" opacity="0.35" stroke-linecap="round"/><path d="${up}" fill="none" stroke="${FEAT}" stroke-width="5.5" stroke-linecap="round"/>` +
    F(`M-32 ${2 + e.to} C-38 ${f(-2 + e.to)} -44 ${f(-4 + e.to)} -48 ${f(-12 + e.to)} C-40 ${f(-6 + e.to)} -34 ${f(-6 + e.to)} -28 ${f(-6 + e.to)}Z`, FEAT) +
    L(`M30 8 C14 17 -12 18 -26 ${f(9 + e.to * 0.4)}`, 1.8, CD) +
    L(`M-24 ${f(-24 * o + e.to * 0.5 - 6)} C-10 ${f(-32 * o - 4)} 12 ${f(-32 * o + e.ti * 0.5 - 4)} 26 ${f(-18 * o + e.ti - 6)}`, 1.8, CD, ` opacity="0.8"`);
  let extra = "";
  if (e.tear) extra = `<circle cx="-20" cy="30" r="10" fill="${C}" opacity="0.35"/>` + F("M-20 16 C-16 28 -18 36 -24 40 C-30 36 -30 28 -20 16Z", "#ffffff", ` stroke="${CD}" stroke-width="1.5"`);
  return sclera + lash + extra;
}
function brows(x) {
  const Bw = {
    normal: "M-36 -8 C-20 -16 6 -16 28 -10 C6 -12 -18 -10 -36 -4Z",
    smile: "M-36 -12 C-20 -20 6 -20 28 -14 C6 -16 -18 -14 -36 -8Z",
    angry: "M-36 -16 C-14 -14 10 -6 30 4 C8 -2 -16 -8 -36 -10Z",
    sad: "M-36 4 C-18 -6 6 -14 28 -20 C8 -14 -16 -4 -36 8Z",
    surprise: "M-36 -20 C-20 -30 6 -30 28 -24 C6 -26 -18 -24 -36 -16Z",
    serious: "M-36 -6 C-18 -10 8 -8 28 -2 C8 -6 -18 -6 -36 -2Z",
  }[x];
  return F(Bw, FEAT, ` stroke="${FEAT}" stroke-width="2" stroke-linejoin="round"`);
}
function mouth(x) {
  switch (x) {
    case "smile": return F("M578 368 C590 384 610 384 622 368 C610 374 590 374 578 368Z", "#4a9ad8", ` stroke="${FEAT}" stroke-width="2.5" stroke-linejoin="round"`);
    case "angry": return F("M580 380 C590 370 610 370 620 380 C610 386 590 386 580 380Z", FEAT, ` stroke="${FEAT}" stroke-width="2.5"`) + L("M586 376 L614 376", 2, "#fff");
    case "sad": return L("M584 382 C592 376 608 376 616 382", 2.8, FEAT);
    case "surprise": return F("M592 368 C592 360 608 360 608 368 C610 382 604 390 600 390 C596 390 590 382 592 368Z", FEAT, ` stroke="${FEAT}" stroke-width="2"`);
    case "serious": return L("M586 376 L614 376", 2.8, FEAT);
    default: return L("M584 372 C592 379 608 379 616 372", 2.8, FEAT); // 잔잔한 미소
  }
}
function face(x) {
  const e = EXP[x];
  const eL = `<g transform="translate(553 292)">${eye(e, "L")}</g>`;
  const eR = `<g transform="translate(647 292) scale(-1 1)">${eye(e, "R")}</g>`;
  const bL = `<g transform="translate(552 250)">${brows(x)}</g>`, bR = `<g transform="translate(648 250) scale(-1 1)">${brows(x)}</g>`;
  const nose = L("M602 330 C604 340 604 346 598 350", 2.2, CD);
  const blush = x === "smile" || x === "sad" ? `<ellipse cx="530" cy="340" rx="24" ry="9" fill="#9fdcff" opacity="0.6"/><ellipse cx="670" cy="340" rx="24" ry="9" fill="#9fdcff" opacity="0.6"/>` : "";
  // 이마의 회로 문양
  const mark = F("M600 188 L610 204 L600 220 L590 204Z", "#ffffff", ` stroke="${CD}" stroke-width="2"`) + L("M580 204 L560 204 M620 204 L640 204", 2, CD, ` opacity="0.7"`);
  let fx = "";
  if (x === "surprise") fx = L("M500 170 l-12 -14 M700 170 l12 -14", 3, CW);
  if (x === "angry") fx = L("M530 330 L560 334 M640 334 L670 330", 2, "#2a7ac0", ` opacity="0.6"`);
  return blush + eL + eR + bL + bR + nose + mouth(x) + mark + fx;
}
// ── 앞머리 + 어깨 앞으로 흘러내리는 빛 가닥 ──────────────
function hairFront() {
  const ds = [
    "M486 270 C474 180 520 112 600 108 C682 112 728 180 714 270 C700 230 676 200 640 188 C620 182 600 182 600 182 C600 182 580 182 560 188 C524 200 500 230 486 270Z",
    leaf([598, 184], [560, 190], [520, 290], -10, 8),
    leaf([600, 184], [570, 196], [560, 262], -6, 4),
    leaf([602, 184], [640, 190], [680, 290], 10, -8),
    leaf([600, 184], [630, 196], [640, 262], 6, -4),
    leaf([540, 196], [500, 230], [490, 330], -8, 4),
    leaf([660, 196], [700, 230], [710, 330], 8, -4),
    // 얼굴 옆 긴 가닥 (바깥으로 휘날림)
    "M494 250 C474 330 470 420 476 520 C482 620 470 700 440 790 C480 740 504 660 510 560 C516 460 516 360 520 280Z",
    "M706 250 C726 330 730 420 724 520 C718 620 730 700 760 790 C720 740 696 660 690 560 C684 460 684 360 680 280Z",
  ];
  let o = ds.map((d) => F(d, `url(#${P}hairF)`)).join("") +
    clipG(ds, `<rect x="300" y="100" width="600" height="700" fill="url(#${P}scan)"/>` +
      // 윤기 띠
      F("M512 196 C550 160 650 160 690 196 C670 186 640 176 600 176 C560 176 530 186 512 196Z", "#ffffff", ` opacity="0.4"`) +
      F("M520 160 C540 130 570 116 600 112 C560 130 540 150 530 180Z", "#ffffff", ` opacity="0.55"`) + F("M680 160 C660 130 630 116 600 112 C640 130 660 150 670 180Z", "#ffffff", ` opacity="0.35"`)) +
    ds.map((d) => L(d, 10, C, ` opacity="0.2"`) + L(d, 2.6, CW)).join("");
  o += g2("M600 112 C568 130 540 160 520 214", 1.4) + g2("M600 112 C632 130 660 160 680 214", 1.4) + g2("M600 112 C584 140 572 166 564 194", 1.2) + g2("M600 112 C616 140 628 166 636 194", 1.2) +
    g2("M560 190 C540 230 528 270 524 300", 1.4) + g2("M640 190 C660 230 672 270 676 300", 1.4) +
    g2("M486 330 C478 450 476 560 456 700", 1.4) + g2("M714 330 C722 450 724 560 744 700", 1.4);
  // 귀 장치: 동심원 고리
  const ear = (x) => `<circle cx="${x}" cy="300" r="22" fill="${C}" opacity="0.3"/><circle cx="${x}" cy="300" r="16" fill="none" stroke="${CW}" stroke-width="3"/><circle cx="${x}" cy="300" r="7" fill="#fff"/>` +
    L(`M${x} 278 L${x + (x < 600 ? -14 : 14)} 240`, 3, CW) + L(`M${x} 278 L${x + (x < 600 ? -14 : 14)} 240`, 9, C, ` opacity="0.3"`);
  return o + ear(494) + ear(706);
}

export function svg(expr = "normal") {
  if (!EXP[expr]) expr = "normal";
  clipN = 0; clips.length = 0;
  const out = halo() + disc(false) + hairBack() + trails() + body() + arms() + neckHead() + face(expr) + hairFront() + disc(true) + particles();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${defs()}${clips.join("")}</defs>${out}</svg>`;
}
