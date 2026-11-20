// 니르바 — 에일 여제. 고요하고 두려운 존재. 전신 입간판 SVG. 몸은 고정, 얼굴만 표정별로 바뀐다.
// 히든 스토리 2 「별의 저편」. 광원: 왼쪽 위 / 림 라이트: 포인트 보라 + 금빛
export const ID = "nirva", NAME = "니르바";

const O = "#120a1e";            // 외곽선(어두운 피부라 더 진하게)
const AC = "#c060ff";           // 포인트 색
const RIM = "#e6a8ff";          // 림 라이트
const GLW = "#a040ff";          // 발광 바깥빛
const GD = "url(#nirva-gold)", GD2 = "#8a5a12", GDL = "#fff2b8";

// ── 그리기 도우미 ─────────────────────────────────────────────
let defs, uid;
const nid = () => `nirva-${uid++}`;
function S(d, fill, o = {}) {
  const id = nid();
  const sh = o.sh, sx = o.sx ?? -20, sy = o.sy ?? -14;
  let s = "";
  defs.push(`<clipPath id="${id}c"><path d="${d}"/></clipPath>`);
  const op = o.op ? ` opacity="${o.op}"` : "";
  if (sh) s += `<path d="${d}" fill="${sh}"${op}/><g clip-path="url(#${id}c)"><path d="${d}" fill="${fill}" transform="translate(${sx} ${sy})"${op}/>`;
  else s += `<path d="${d}" fill="${fill}"${op}/><g clip-path="url(#${id}c)">`;
  if (o.in) s += o.in;
  if (o.rim !== false) {
    const rw = o.rw ?? 7;
    defs.push(`<mask id="${id}m"><path d="${d}" fill="#fff"/><path d="${d}" fill="#000" transform="translate(${-rw} ${rw * 0.4})"/></mask>`);
    s += `<path d="${d}" fill="${o.rc ?? RIM}" mask="url(#${id}m)" opacity="${o.ro ?? 0.85}"/>`;
  }
  s += `</g>`;
  if (o.w !== 0) s += `<path d="${d}" fill="none" stroke="${o.st ?? O}" stroke-width="${o.w ?? 4.5}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return s;
}
const L = (d, w = 2.5, c = O, op = 1) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const F = (d, c, op = 1) => `<path d="${d}" fill="${c}"${op < 1 ? ` opacity="${op}"` : ""}/>`;
const G = (d, w = 3, c = AC, halo = GLW) => `<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${d}" stroke="${halo}" stroke-width="${w * 5}" opacity=".13"/><path d="${d}" stroke="${halo}" stroke-width="${w * 2.4}" opacity=".3"/><path d="${d}" stroke="${c}" stroke-width="${w}"/><path d="${d}" stroke="#fff" stroke-width="${w * 0.38}" opacity=".9"/></g>`;
const D = (x, y, r = 4, c = AC, h = GLW) => `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="${h}" opacity=".16"/><circle cx="${x}" cy="${y}" r="${r * 1.7}" fill="${h}" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.45}" fill="#fff"/>`;
function star(cx, cy, r1, r2, n = 4, rot = -90) {
  let p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? r2 : r1;
    p.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return "M" + p.join(" L") + "Z";
}
// 결정 조각: (x,y) 끝점, 방향 각(도), 길이, 폭
function crystal(x, y, ang, len, w, fill = "url(#nirva-crys)") {
  const a = (ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const P = (t, k) => `${(x - ux * len * (1 - t) + px * k).toFixed(1)} ${(y - uy * len * (1 - t) + py * k).toFixed(1)}`;
  const outline = `M${P(0, 0)} L${P(0.25, -w * 0.5)} L${P(1, 0)} L${P(0.25, w * 0.5)} Z`;
  return S(outline, fill, { w: 2.5, rim: false, sh: "#7a30d0", sx: -3, sy: -3,
    in: F(`M${P(0, 0)} L${P(0.25, -w * 0.5)} L${P(1, 0)} Z`, "#fff", 0.55) + L(`M${P(0.02, 0)} L${P(0.98, 0)}`, 1.2, "#fff", 0.8) });
}
// 결정적 난수
function rng(seed) { let x = seed; return () => ((x = (x * 16807) % 2147483647) / 2147483647); }
// 은하 반점(클립 안에서 사용)
function speck(x0, y0, x1, y1, n, seed, big = 0.06) {
  const r = rng(seed); let s = "";
  const cols = ["#ffffff", "#f0c8ff", "#9fe8ff", "#ffd6f0"];
  for (let i = 0; i < n; i++) {
    const x = (x0 + r() * (x1 - x0)).toFixed(0), y = (y0 + r() * (y1 - y0)).toFixed(0), k = r();
    const c = cols[Math.floor(r() * 4)];
    if (k < big) s += `<path d="${star(+x, +y, 7, 1.6)}" fill="${c}"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${(0.8 + k * 1.8).toFixed(1)}" fill="${c}" opacity="${(0.45 + k * 0.5).toFixed(2)}"/>`;
  }
  return s;
}

// ── 색 ─────────────────────────────────────────────────────
const SK = "url(#nirva-skin)", SK2 = "#1a1030", SK3 = "#0e0820";
const HB = "url(#nirva-hair)", HS = "#b2a4e0", HD = "#7e6cc0";
const DR = "url(#nirva-dress)", DR2 = "#0a0616";

function gradients() {
  return `
<linearGradient id="nirva-skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3878"/><stop offset=".5" stop-color="#33255a"/><stop offset="1" stop-color="#271a46"/></linearGradient>
<linearGradient id="nirva-hair" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="120" y2="1500"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f1ecff"/><stop offset=".8" stop-color="#d6cbf6"/><stop offset="1" stop-color="#c4a8ff"/></linearGradient>
<linearGradient id="nirva-hairF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eee8ff"/><stop offset="1" stop-color="#cfc2f2"/></linearGradient>
<linearGradient id="nirva-crys" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#f4dcff"/><stop offset=".7" stop-color="#c060ff"/><stop offset="1" stop-color="#6a20c0"/></linearGradient>
<linearGradient id="nirva-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c4"/><stop offset=".35" stop-color="#ffd25e"/><stop offset=".65" stop-color="#c88a1c"/><stop offset="1" stop-color="#ffe08a"/></linearGradient>
<linearGradient id="nirva-dress" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a4a"/><stop offset=".5" stop-color="#1a1036"/><stop offset="1" stop-color="#2c1458"/></linearGradient>
<linearGradient id="nirva-mem" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9a8ff" stop-opacity=".18"/><stop offset=".6" stop-color="#a050ff" stop-opacity=".32"/><stop offset="1" stop-color="#e0b8ff" stop-opacity=".55"/></linearGradient>
<linearGradient id="nirva-sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8ccff" stop-opacity=".22"/><stop offset="1" stop-color="#b070ff" stop-opacity=".5"/></linearGradient>
<linearGradient id="nirva-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8dc"/><stop offset=".3" stop-color="#ffe6a0" stop-opacity=".9"/><stop offset=".7" stop-color="#d890ff" stop-opacity=".6"/><stop offset="1" stop-color="#8a3cff" stop-opacity=".2"/></linearGradient>
<linearGradient id="nirva-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a3a06"/><stop offset=".35" stop-color="#d88a10"/><stop offset=".7" stop-color="#ffd24a"/><stop offset="1" stop-color="#fff6c8"/></linearGradient>
<radialGradient id="nirva-orb" cx=".4" cy=".35" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#fff0c0"/><stop offset=".7" stop-color="#e080ff"/><stop offset="1" stop-color="#6a1ec0"/></radialGradient>
<radialGradient id="nirva-aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#d080ff" stop-opacity=".5"/><stop offset="1" stop-color="#d080ff" stop-opacity="0"/></radialGradient>
<radialGradient id="nirva-gaura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd870" stop-opacity=".55"/><stop offset="1" stop-color="#ffd870" stop-opacity="0"/></radialGradient>
<radialGradient id="nirva-neb1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff70d0" stop-opacity=".45"/><stop offset="1" stop-color="#ff70d0" stop-opacity="0"/></radialGradient>
<radialGradient id="nirva-neb2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#50c8ff" stop-opacity=".4"/><stop offset="1" stop-color="#50c8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="nirva-blush" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6ab8" stop-opacity=".5"/><stop offset="1" stop-color="#ff6ab8" stop-opacity="0"/></radialGradient>
<radialGradient id="nirva-ground" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
}

// ── 궤도 고리(뒤 반쪽/앞 반쪽) ─────────────────────────────────
const RINGS = [[600, 1000, 360, 70, -8], [600, 1560, 440, 92, 6], [600, 262, 170, 170, 0]];
function ring([cx, cy, rx, ry, rot], front) {
  const d = front ? `M${cx + rx} ${cy} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}` : `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
  let s = `<g transform="rotate(${rot} ${cx} ${cy})">`;
  s += `<path d="${d}" fill="none" stroke="#ffd25e" stroke-width="26" opacity=".12"/>`;
  s += `<path d="${d}" fill="none" stroke="${O}" stroke-width="11"/><path d="${d}" fill="none" stroke="${GD}" stroke-width="7"/><path d="${d}" fill="none" stroke="${GDL}" stroke-width="1.6" opacity=".9"/>`;
  // 보석
  for (let k = 1; k < 6; k++) {
    const t = (k / 6) * Math.PI + (front ? 0 : Math.PI);
    const gx = +(cx + rx * Math.cos(t)).toFixed(1), gy = +(cy + ry * Math.sin(t)).toFixed(1);
    s += `<path d="M${gx} ${gy - 11} L${gx + 8} ${gy} L${gx} ${gy + 11} L${gx - 8} ${gy} Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2.2"/>`;
  }
  return s + `</g>`;
}

// ── 후광·결정 왕관(뒤) ─────────────────────────────────────────
function halo() {
  let s = "";
  s += `<circle cx="600" cy="262" r="290" fill="url(#nirva-aura)"/>`;
  s += ring(RINGS[2], false) + ring(RINGS[2], true);
  // 떠 있는 결정 파편(방사형) — 가운데가 가장 높다
  const shards = [[-90, 92, 30], [-72, 76, 24], [-108, 76, 24], [-55, 64, 20], [-125, 64, 20], [-38, 54, 17], [-142, 54, 17], [-22, 44, 14], [-158, 44, 14], [-6, 36, 12], [-174, 36, 12]];
  for (const [a, len, w] of shards) {
    const r0 = 176, rad = (a * Math.PI) / 180;
    const x = 600 + Math.cos(rad) * (r0 + len), y = 262 + Math.sin(rad) * (r0 + len);
    s += `<circle cx="${(600 + Math.cos(rad) * (r0 + len * 0.5)).toFixed(0)}" cy="${(262 + Math.sin(rad) * (r0 + len * 0.5)).toFixed(0)}" r="${w * 1.4}" fill="${GLW}" opacity=".18"/>`;
    s += crystal(+x.toFixed(1), +y.toFixed(1), a, len, w);
  }
  // 작은 부유 파편
  for (const [x, y, a] of [[352, 160, -140], [848, 160, -40], [452, 40, -116], [748, 40, -64]]) s += crystal(x, y, a, 26, 10);
  return s;
}

// ── 뒷머리(물속처럼 떠오르는) ───────────────────────────────────
function backHair() {
  let s = "";
  const L1 = "M566 150 C440 160 376 262 356 382 C336 502 266 560 246 680 C228 800 296 880 286 1000 C278 1100 214 1162 190 1262 C242 1222 284 1200 314 1150 C324 1232 304 1302 272 1366 C344 1324 388 1252 398 1172 C418 1062 378 962 398 862 C418 762 470 682 480 562 Z";
  const R1 = "M634 150 C762 156 830 250 856 370 C880 490 950 540 980 650 C1008 770 950 860 968 980 C982 1080 1050 1130 1080 1220 C1024 1190 984 1176 950 1130 C946 1214 970 1282 1006 1344 C930 1310 882 1240 868 1160 C846 1050 884 950 860 850 C838 750 774 676 760 562 Z";
  s += S(L1, HB, { sh: HD, sx: -30, sy: -10, rw: 8, in: F("M300 700 C280 800 330 880 320 990 C312 1080 262 1150 230 1220 C290 1150 344 1080 350 990 C356 900 310 820 330 720 Z", "#5c4aa0", 0.5) });
  s += S(R1, HB, { sh: HD, sx: -30, sy: -10, rw: 10, in: F("M900 640 C950 720 936 820 930 920 C926 1020 990 1100 1040 1180 C980 1130 920 1060 910 960 C900 860 930 760 880 680 Z", "#5c4aa0", 0.5) });
  // 안쪽 덩어리(밝은)
  const L2 = "M548 210 C474 262 452 362 442 462 C432 562 380 642 380 762 C380 862 432 922 422 1022 C414 1102 372 1152 360 1222 C412 1182 442 1132 454 1072 C472 982 442 902 462 802 C482 702 524 642 534 542 Z";
  const R2 = "M652 210 C730 262 750 362 760 462 C770 562 830 642 832 762 C834 862 790 922 802 1022 C810 1102 856 1152 870 1222 C816 1182 784 1132 772 1072 C754 982 782 902 762 802 C742 702 680 642 668 542 Z";
  s += S(L2, HB, { sh: HS, sx: -18, sy: -8, rw: 6, in: F("M470 300 C456 400 452 500 440 600 L450 600 C462 500 468 400 480 300 Z", "#fff", 0.8) });
  s += S(R2, HB, { sh: HS, sx: -18, sy: -8, rw: 8 });
  // 결
  s += L("M372 420 C340 560 280 640 272 760 C266 860 312 930 300 1040", 2, HD, 0.8) + L("M830 420 C860 540 930 600 940 720 C946 820 900 900 920 1020", 2, HD, 0.8);
  s += L("M450 520 C430 640 400 720 404 820 C408 900 440 960 430 1060", 1.8, HD, 0.7) + L("M752 520 C772 640 806 720 806 820 C806 900 776 960 788 1060", 1.8, HD, 0.7);
  return s;
}

// ── 드레스 ────────────────────────────────────────────────────
function backMembranes() {
  let s = "";
  // 뒤로 넓게 퍼지는 빛의 막(가장 뒤)
  const m = "M520 960 C420 1200 260 1500 150 1900 C120 2040 110 2200 120 2390 L1080 2390 C1090 2200 1080 2040 1050 1900 C940 1500 780 1200 680 960 Z";
  s += `<path d="${m}" fill="url(#nirva-mem)" stroke="${AC}" stroke-width="3" stroke-linejoin="round"/>`;
  s += G("M540 1000 C440 1300 300 1700 200 2380 M660 1000 C760 1300 900 1700 1000 2380", 1.4);
  s += G("M560 1000 C500 1400 420 1900 380 2380 M640 1000 C700 1400 780 1900 820 2380", 1.1);
  return s;
}
function skirt() {
  let s = "";
  s += `<ellipse cx="600" cy="2384" rx="380" ry="24" fill="url(#nirva-ground)"/>`;
  // 별하늘 치마
  const sk = "M540 940 C500 1100 440 1400 380 1700 C340 1900 300 2140 270 2390 L930 2390 C900 2140 860 1900 820 1700 C760 1400 700 1100 660 940 Z";
  s += S(sk, DR, { sh: DR2, sx: -30, sy: 0, rw: 10,
    in: `<ellipse cx="480" cy="1800" rx="200" ry="300" fill="url(#nirva-neb1)"/><ellipse cx="760" cy="2100" rx="220" ry="260" fill="url(#nirva-neb2)"/><ellipse cx="640" cy="1400" rx="160" ry="200" fill="url(#nirva-neb1)"/>`
      + speck(260, 960, 940, 2390, 260, 7, 0.07)
      + L("M560 1000 C520 1300 470 1700 420 2390", 3, "#05030c", 0.6) + L("M640 1000 C680 1300 730 1700 780 2390", 3, "#05030c", 0.6)
      + L("M590 1100 C570 1500 540 1900 520 2390", 2, "#05030c", 0.4) + L("M610 1100 C630 1500 660 1900 680 2390", 2, "#05030c", 0.4) });
  // 금빛 밑단 장식
  s += S("M270 2390 C300 2340 330 2320 360 2330 C420 2350 480 2346 540 2336 C580 2330 620 2330 660 2336 C720 2346 780 2350 840 2330 C870 2320 900 2340 930 2390 Z", GD, { sh: GD2, sx: -10, sy: -6, w: 3.5, rim: false });
  for (let x = 340; x < 880; x += 60) s += `<path d="M${x} 2350 L${x + 8} 2362 L${x} 2374 L${x - 8} 2362 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  // 가운데 빛의 폭포(세로 판)
  const lp = "M584 990 C576 1300 556 1800 536 2340 L664 2340 C644 1800 624 1300 616 990 Z";
  s += `<path d="${lp}" fill="url(#nirva-light)" opacity=".7" stroke="${GD2}" stroke-width="3"/>`;
  s += L("M600 1000 L600 2330", 3, "#fff", 0.7) + L("M590 1000 C584 1400 572 1900 560 2330 M610 1000 C616 1400 628 1900 640 2330", 1.5, "#fff", 0.45);
  for (let y = 1100; y < 2300; y += 110) s += `<path d="${star(600, y, 14, 3)}" fill="#fff"/><circle cx="600" cy="${y}" r="16" fill="#ffe6a0" opacity=".3"/>`;
  // 반투명 겉 막(층층이 겹친 꽃잎) — 좌우
  const ml = [
    "M540 960 C470 1160 380 1420 300 1680 C270 1780 250 1880 240 2000 C280 1960 330 1950 370 1980 C380 1900 400 1820 430 1740 C470 1500 520 1220 560 990 Z",
    "M545 1100 C470 1400 390 1700 330 2020 C310 2140 300 2260 300 2390 L420 2390 C430 2240 450 2080 480 1940 C510 1660 540 1380 560 1120 Z",
  ];
  const mr = ml.map((d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${1200 - +x} ${y}`));
  for (const d of [...ml, ...mr]) {
    s += `<path d="${d}" fill="url(#nirva-mem)" stroke="${AC}" stroke-width="3" stroke-linejoin="round"/>` + L(d, 1.2, "#fff", 0.45);
  }
  s += G("M530 1000 C460 1300 380 1600 300 1980 M548 1150 C480 1500 410 1900 370 2380", 1.2);
  s += G("M670 1000 C740 1300 820 1600 900 1980 M652 1150 C720 1500 790 1900 830 2380", 1.2);
  // 발끝(살짝 보이는 금빛 신)
  s += S("M520 2330 C540 2316 576 2316 590 2330 L594 2392 L512 2392 Z", GD, { sh: GD2, sx: -6, sy: -4, w: 3.5, rim: false });
  return s;
}

function torso() {
  let s = "";
  // 어깨·팔 위쪽은 피부, 몸통은 보디스
  const skin = "M572 440 C540 456 506 466 486 486 C470 504 470 540 478 570 L722 570 C730 540 730 504 714 486 C694 466 660 456 628 440 Z";
  s += S(skin, SK, { sh: SK2, sx: -20, sy: -10, rw: 6, in: speck(470, 440, 730, 580, 40, 3, 0.1) });
  // 쇄골
  s += L("M540 500 C560 506 580 508 594 506 M606 506 C620 508 640 506 660 500", 2, "#0a0616", 0.8);
  const bod = "M486 548 C520 568 560 572 600 556 C640 572 680 568 714 548 C726 600 720 660 700 720 C686 780 664 840 660 900 C662 930 668 950 676 970 C640 990 560 990 524 970 C532 950 538 930 540 900 C536 840 514 780 500 720 C480 660 474 600 486 548 Z";
  s += S(bod, DR, { sh: DR2, sx: -24, sy: -10, rw: 8,
    in: speck(470, 540, 730, 980, 60, 11, 0.06)
      + F("M500 580 C520 600 540 640 548 700 C530 660 510 620 496 600 Z", "#6a4aa8", 0.6)
      + L("M520 700 C546 716 576 720 596 712 M604 712 C624 720 654 716 680 700", 2.2, "#05030c", 0.7) });
  // 금 장식 줄(필리그리)
  s += S("M486 546 C520 566 560 572 600 554 C640 572 680 566 714 546 L716 566 C680 588 640 594 600 578 C560 594 520 588 484 566 Z", GD, { sh: GD2, sx: -6, sy: -4, w: 3, rim: false });
  s += L("M600 600 C580 640 560 680 556 740 C552 800 572 860 600 900 C628 860 648 800 644 740 C640 680 620 640 600 600 Z", 3, GD2) + L("M600 600 C580 640 560 680 556 740 C552 800 572 860 600 900 C628 860 648 800 644 740 C640 680 620 640 600 600 Z", 1.6, "#ffd25e");
  s += L("M556 740 C530 740 512 720 506 690 M644 740 C670 740 688 720 694 690 M570 840 C550 850 536 870 534 900 M630 840 C650 850 664 870 666 900", 2.2, "#ffd25e", 0.9);
  // 가슴 보석
  s += `<circle cx="600" cy="648" r="56" fill="url(#nirva-gaura)"/>`;
  s += S("M600 612 L630 648 L600 690 L570 648 Z", "url(#nirva-crys)", { w: 3.5, rim: false, in: F("M600 612 L600 690 L570 648 Z", "#fff", 0.5) });
  s += S("M562 640 C566 626 578 618 590 618 L570 648 Z M638 640 C634 626 622 618 610 618 L630 648 Z", GD, { w: 2.5, rim: false });
  // 허리 띠 + 늘어진 빛 사슬
  s += S("M522 950 C560 966 640 966 678 950 L684 984 C640 1002 560 1002 516 984 Z", GD, { sh: GD2, sx: -8, sy: -5, w: 3.5, rim: false });
  s += `<circle cx="600" cy="976" r="16" fill="url(#nirva-orb)" stroke="${O}" stroke-width="2.5"/>`;
  for (const [x0, x1, y1] of [[540, 520, 1180], [560, 548, 1260], [640, 652, 1260], [660, 680, 1180]]) {
    s += L(`M${x0} 990 C${x0} 1060 ${x1} 1120 ${x1} ${y1}`, 2, GD2) + L(`M${x0} 990 C${x0} 1060 ${x1} 1120 ${x1} ${y1}`, 1, "#ffe08a");
    s += `<path d="M${x1} ${y1} L${x1 + 7} ${y1 + 12} L${x1} ${y1 + 26} L${x1 - 7} ${y1 + 12} Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  }
  return s;
}

// 목 + 높은 막 깃(메디치 칼라)
function collar() {
  let s = "";
  const c = "M500 500 C470 440 452 370 466 300 C486 330 506 352 530 366 C520 330 524 296 540 268 C556 320 576 360 600 380 C624 360 644 320 660 268 C676 296 680 330 670 366 C694 352 714 330 734 300 C748 370 730 440 700 500 Z";
  s += `<path d="${c}" fill="url(#nirva-sleeve)" stroke="${AC}" stroke-width="3" stroke-linejoin="round"/>`;
  s += L("M500 490 C486 430 476 370 470 310 M530 470 C530 420 534 340 540 274 M700 490 C714 430 724 370 730 310 M670 470 C670 420 666 340 660 274", 2, "#ffd25e", 0.85);
  return s;
}
function neck() {
  let s = "";
  s += S("M572 380 C576 416 574 446 566 484 L634 484 C626 446 624 416 628 380 Z", SK, { sh: SK2, sx: -12, sy: 0, w: 4,
    in: F("M566 390 C590 426 612 426 634 390 L634 440 C612 456 590 456 566 440 Z", SK3, 0.85) + speck(566, 380, 634, 484, 8, 5, 0) });
  // 목걸이
  s += L("M560 468 C580 486 620 486 640 468", 4, GD2) + L("M560 468 C580 486 620 486 640 468", 2, "#ffd25e");
  s += `<path d="M600 480 L610 496 L600 516 L590 496 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  return s;
}

// ── 팔 ───────────────────────────────────────────────────────
// 화면 왼쪽 팔: 손바닥을 위로 펼쳐 빛 구슬을 띄움
function armL() {
  let s = "";
  const up = "M490 488 C462 496 446 530 444 572 C440 650 430 720 420 790 L462 806 C476 736 488 664 500 590 C506 556 508 520 504 496 Z";
  s += S(up, SK, { sh: SK2, sx: -14, sy: -6, rw: 5, in: speck(420, 480, 510, 810, 22, 21, 0.1) });
  const fa = "M420 784 C400 760 374 728 346 694 L322 716 C344 752 374 790 404 822 C424 838 452 824 462 806 Z";
  s += S(fa, SK, { sh: SK2, sx: -10, sy: -8, rw: 5, in: speck(320, 690, 470, 840, 16, 23, 0.1) });
  // 팔찌
  s += S("M336 690 L358 706 L336 732 L314 716 Z", GD, { w: 3, rim: false });
  s += L("M326 696 C334 710 344 722 352 728", 6, O) + L("M326 696 C334 710 344 722 352 728", 3.5, "#ffd25e");
  // 손(손바닥 위, 손가락 살짝 오므림) 1.35배
  s += `<g transform="translate(336 712) scale(1.35) translate(-336 -712)">`;
  const palm = "M340 700 C322 690 296 680 274 676 C262 676 258 686 266 694 C282 708 306 722 326 728 Z";
  s += S(palm, SK, { sh: SK2, sx: -6, sy: -6, w: 3.5, rw: 3, in: F("M276 682 C296 686 316 694 332 704", "none") + L("M282 690 C300 698 316 708 328 716", 1.5, "#0a0616", 0.6) });
  const fing = [
    "M276 678 C264 666 254 650 252 638 C252 630 260 628 266 634 C274 646 282 660 290 672 Z",
    "M290 680 C282 662 276 644 276 628 C276 620 286 618 290 626 C296 640 302 658 304 676 Z",
    "M306 686 C302 668 300 652 302 638 C304 630 312 630 314 638 C318 652 318 670 318 690 Z",
    "M320 694 C320 680 322 666 326 656 C330 650 336 652 336 660 C336 672 334 688 332 700 Z",
  ];
  fing.forEach((f) => (s += S(f, SK, { sh: SK2, sx: -4, sy: -4, w: 3, rw: 2.5 })));
  s += S("M300 724 C286 728 270 728 258 722 C252 716 256 710 264 710 C278 712 292 712 306 708 Z", SK, { sh: SK2, sx: -4, sy: -4, w: 3, rw: 2.5 });
  // 금빛 손톱
  s += F("M253 636 C254 630 260 630 262 634 Z M277 626 C279 620 286 620 288 625 Z M303 636 C305 630 311 630 313 636 Z M327 656 C330 651 335 652 336 658 Z", "#ffd25e");
  s += `</g>`;
  // 떠 있는 빛 구슬 + 작은 궤도
  s += `<g transform="translate(-30 -40)">` + `<circle cx="292" cy="560" r="110" fill="url(#nirva-aura)"/><circle cx="292" cy="560" r="60" fill="url(#nirva-gaura)"/>`;
  s += ring([292, 560, 78, 22, -16], false);
  s += S("M292 520 C316 520 334 538 334 562 C334 586 316 604 292 604 C268 604 250 586 250 562 C250 538 268 520 292 520 Z", "url(#nirva-orb)", { w: 3.5, rim: false,
    in: `<path d="${star(292, 562, 26, 4, 4, -90)}" fill="#fff" opacity=".85"/>` + F("M266 548 C270 536 280 528 292 526 C282 534 276 544 274 556 Z", "#fff", 0.9) });
  s += ring([292, 560, 78, 22, -16], true);
  for (const [x, y, r] of [[230, 480, 3], [356, 470, 2.4], [212, 600, 2], [370, 620, 2.6], [292, 450, 2]]) s += D(x, y, r, "#ffe6a0", "#ffb040");
  s += `</g>`;
  return s;
}
// 화면 왼쪽 소매(넓은 막 소매, 팔 위에 반투명)
function sleeveL() {
  const d = "M500 480 C450 480 420 520 412 580 C404 660 380 740 320 820 C280 880 240 960 220 1060 C260 1040 300 1040 330 1066 C350 1030 380 1010 410 1010 C420 960 440 900 470 840 C490 800 500 760 506 720 C512 640 520 560 500 480 Z";
  let s = `<path d="${d}" fill="url(#nirva-sleeve)" stroke="${AC}" stroke-width="3" stroke-linejoin="round"/>` + L(d, 1.2, "#fff", 0.5);
  s += G("M470 520 C450 640 410 760 340 860 C300 920 260 990 236 1056 M490 600 C480 720 450 840 380 1010", 1.2);
  s += L("M222 1056 C262 1036 300 1038 330 1064 C350 1028 380 1010 410 1008", 4, GD2) + L("M222 1056 C262 1036 300 1038 330 1064 C350 1028 380 1010 410 1008", 2, "#ffd25e");
  return s;
}
// 화면 오른쪽 팔: 늘어뜨려 손가락을 펼침
function armR() {
  let s = "";
  const up = "M710 488 C740 496 756 532 758 574 C762 650 776 720 790 790 L748 806 C732 736 716 664 702 590 C696 556 694 520 698 496 Z";
  s += S(up, SK, { sh: SK2, sx: -14, sy: -6, rw: 7, in: speck(694, 480, 790, 810, 22, 31, 0.1) });
  const fa = "M790 784 C808 870 826 960 842 1050 L806 1060 C788 970 768 880 750 800 Z";
  s += S(fa, SK, { sh: SK2, sx: -10, sy: -6, rw: 7, in: speck(740, 780, 850, 1070, 20, 33, 0.1) });
  s += L("M802 1044 C814 1050 830 1052 844 1046", 7, O) + L("M802 1044 C814 1050 830 1052 844 1046", 4, "#ffd25e");
  // 손(아래로, 손가락 우아하게 펼침) 1.35배
  s += `<g transform="translate(824 1050) scale(1.35) translate(-824 -1050)">`;
  const palm = "M806 1056 C800 1080 800 1104 808 1124 C820 1132 840 1132 852 1122 C858 1100 856 1074 846 1052 Z";
  s += S(palm, SK, { sh: SK2, sx: -6, sy: -6, w: 3.5, rw: 3 });
  const fing = [
    "M810 1118 C806 1140 806 1162 810 1180 C814 1188 822 1186 822 1178 C822 1160 822 1142 822 1124 Z",
    "M824 1124 C824 1150 826 1176 830 1196 C834 1204 842 1202 842 1194 C840 1172 838 1150 836 1126 Z",
    "M838 1122 C840 1146 846 1168 852 1186 C856 1194 864 1190 862 1182 C858 1162 852 1140 848 1118 Z",
    "M850 1112 C856 1128 864 1144 872 1156 C878 1162 884 1156 880 1148 C874 1134 866 1118 858 1102 Z",
  ];
  fing.forEach((f) => (s += S(f, SK, { sh: SK2, sx: -4, sy: -4, w: 3, rw: 2.5 })));
  s += S("M808 1070 C796 1086 790 1104 792 1122 C794 1130 802 1130 804 1122 C806 1106 812 1092 820 1080 Z", SK, { sh: SK2, sx: -4, sy: -4, w: 3, rw: 2.5 });
  s += F("M811 1178 C812 1186 820 1186 821 1179 Z M831 1194 C832 1202 840 1202 841 1194 Z M853 1185 C856 1192 862 1190 861 1183 Z M873 1155 C877 1160 882 1156 879 1150 Z", "#ffd25e");
  s += `</g>`;
  return s;
}
function sleeveR() {
  const d = "M700 480 C750 480 780 520 790 580 C800 660 830 760 880 860 C920 940 960 1040 980 1160 C944 1140 904 1140 876 1166 C860 1130 840 1110 812 1106 C800 1040 780 960 760 880 C740 800 700 720 694 640 C690 580 690 520 700 480 Z";
  let s = `<path d="${d}" fill="url(#nirva-sleeve)" stroke="${AC}" stroke-width="3" stroke-linejoin="round"/>` + L(d, 1.2, "#fff", 0.5);
  s += G("M730 520 C760 640 800 760 860 880 C900 960 940 1060 966 1150 M712 600 C730 720 760 840 800 1000", 1.2);
  s += L("M978 1158 C944 1138 904 1140 876 1164 C860 1130 840 1110 812 1104", 4, GD2) + L("M978 1158 C944 1138 904 1140 876 1164 C860 1130 840 1110 812 1104", 2, "#ffd25e");
  // 어깨 금 장식(견장)
  return s;
}
function shoulders() {
  let s = "";
  for (const k of [-1, 1]) {
    const X = (x) => 600 + k * (x - 600);
    const d = `M${X(548)} 474 C${X(512)} 474 ${X(482)} 486 ${X(464)} 510 C${X(456)} 522 ${X(452)} 536 ${X(454)} 548 C${X(470)} 528 ${X(500)} 512 ${X(540)} 502 Z`;
    s += crystal(X(450), 470, k > 0 ? -50 : -130, 70, 18);
  }
  return s;
}

// ── 얼굴 ─────────────────────────────────────────────────────
function eye(cx, cy, s1, ex) {
  const X = (x) => cx + s1 * x;
  // 기본: 반쯤 내리뜬 고요한 눈
  let up = [4, 8, 8, 4], lo = 0, ir = 1;
  if (ex === "smile") { lo = 8; up = [5, 9, 9, 6]; }
  if (ex === "angry") { up = [14, 14, 6, 2]; }
  if (ex === "sad") { up = [0, 4, 9, 12]; lo = 2; }
  if (ex === "surprise") { up = [-3, -6, -7, -4]; lo = -4; ir = 0.72; }
  if (ex === "serious") { up = [10, 14, 14, 8]; lo = 2; }
  const P = (x, y) => `${X(x).toFixed(1)} ${(cy + y).toFixed(1)}`;
  const ui = [-34, 4 + up[0]], u1 = [-22, -24 + up[1]], u2 = [18, -32 + up[2]], uo = [46, -12 + up[3]];
  const li = [-30, 18 - lo * 0.4], l1 = [-12, 28 - lo], l2 = [22, 28 - lo], lO = [42, 8 - lo * 0.3];
  const white = `M${P(...ui)} C${P(...u1)} ${P(...u2)} ${P(...uo)} C${P(46, -2)} ${P(44, 4)} ${P(...lO)} C${P(...l2)} ${P(...l1)} ${P(...li)} Z`;
  const id = nid();
  defs.push(`<clipPath id="${id}"><path d="${white}"/></clipPath>`);
  let s = `<path d="${white}" fill="#fff8ee"/>`;
  const icx = X(4), icy = cy + 2, rx = 22 * ir, ry = 26 * ir;
  s += `<g clip-path="url(#${id})">`;
  s += `<ellipse cx="${icx}" cy="${icy}" rx="${rx}" ry="${ry}" fill="url(#nirva-iris)" stroke="#4a2600" stroke-width="2.5"/>`;
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; s += L(`M${(icx + Math.cos(a) * rx * 0.4).toFixed(1)} ${(icy + Math.sin(a) * ry * 0.4).toFixed(1)} L${(icx + Math.cos(a) * rx * 0.88).toFixed(1)} ${(icy + Math.sin(a) * ry * 0.88).toFixed(1)}`, 1.2, "#fff6c8", 0.5); }
  s += `<ellipse cx="${icx}" cy="${icy}" rx="${rx * 0.62}" ry="${ry * 0.62}" fill="none" stroke="#fff2b0" stroke-width="1.6" opacity=".7"/>`;
  // 세로 동공(빛나는 테)
  s += `<ellipse cx="${icx}" cy="${icy}" rx="${4.5 * ir}" ry="${15 * ir}" fill="#2a1200"/><ellipse cx="${icx}" cy="${icy}" rx="${1.6 * ir}" ry="${8 * ir}" fill="#ffe680"/>`;
  s += `<path d="M${P(ui[0], ui[1] - 6)} C${P(u1[0], u1[1] - 6)} ${P(u2[0], u2[1] - 6)} ${P(uo[0], uo[1] - 6)} L${P(uo[0], uo[1] + 10)} C${P(u2[0], u2[1] + 16)} ${P(u1[0], u1[1] + 16)} ${P(ui[0], ui[1] + 8)} Z" fill="#6a3a10" opacity=".4"/>`;
  s += `<ellipse cx="${icx - 8}" cy="${icy - 10 * ir}" rx="${7 * ir}" ry="${9 * ir}" fill="#fff"/><circle cx="${icx + 10 * ir}" cy="${icy + 12 * ir}" r="${3.4 * ir}" fill="#fff"/><circle cx="${icx + 9 * ir}" cy="${icy - 11 * ir}" r="2.2" fill="#fff" opacity=".9"/>`;
  s += `</g>`;
  const up2 = (p, k) => [p[0], p[1] - k];
  const a = up2(ui, 1.5), b = up2(u1, 6), c = up2(u2, 9), d = up2(uo, 7);
  s += `<path d="M${P(...ui)} C${P(...u1)} ${P(...u2)} ${P(...uo)} L${P(60, -24 + up[3])} L${P(46, -19 + up[3])} C${P(...c)} ${P(...b)} ${P(...a)} Z" fill="#0a0410" stroke="#0a0410" stroke-width="2" stroke-linejoin="round"/>`;
  s += L(`M${P(34, -26 + up[3])} l${s1 * 12} -10 M${P(44, -20 + up[3])} l${s1 * 14} -4`, 2.2, "#0a0410");
  s += L(`M${P(-4, -30 + up[1] * 0.6)} C${P(10, -34 + up[2] * 0.8)} ${P(26, -32 + up[2])} ${P(42, -24 + up[3])}`, 1.6, "#c090ff", 0.6);
  s += L(`M${P(...lO)} C${P(...l2)} ${P(4, 29 - lo)} ${P(-10, 27 - lo)}`, 2, "#0a0410", 0.85);
  // 눈 아래 금빛 점 장식
  s += D(X(40), cy + 34, 2.2, "#ffe08a", "#ffb040");
  if (ex === "smile") s += L(`M${P(-22, 36 - lo)} C${P(-4, 42 - lo)} ${P(18, 42 - lo)} ${P(34, 32 - lo)}`, 2, "#a080e0", 0.7);
  return s;
}
function brow(cx, cy, s1, ex) {
  const X = (x) => cx + s1 * x;
  const [di, dO] = { normal: [0, 0], smile: [-3, -1], angry: [14, -6], sad: [-10, 8], surprise: [-14, -12], serious: [8, 0] }[ex];
  const P = (x, y) => `${X(x).toFixed(1)} ${(cy + y).toFixed(1)}`;
  const arch = ex === "angry" ? -2 : ex === "sad" ? -6 : -8;
  return `<path d="M${P(-28, di)} C${P(-8, di + arch)} ${P(24, dO + arch - 2)} ${P(48, dO + 4)} C${P(24, dO + arch + 2)} ${P(-8, di + arch + 6)} ${P(-28, di + 6)} Z" fill="#f2ecff" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
}
function mouth(ex) {
  const R = "#3a0a30", LP = "#7a3a9a";
  switch (ex) {
    case "smile":
      return S("M580 378 C592 386 608 386 620 378 C616 394 606 400 600 400 C594 400 584 394 580 378 Z", R, { w: 3, rim: false, in: F("M586 392 C594 388 606 388 614 392 C608 400 592 400 586 392 Z", "#c06aa0") + F("M584 378 C594 384 606 384 616 378 L614 384 C606 388 594 388 586 384 Z", "#fff") });
    case "angry":
      return S("M578 382 C590 374 610 374 622 382 C618 396 608 400 600 400 C592 400 582 396 578 382 Z", R, { w: 3, rim: false, in: F("M580 378 C590 374 610 374 620 378 L618 386 C608 382 592 382 582 386 Z", "#fff") + F("M584 394 C594 390 606 390 616 394 L614 402 L586 402 Z", "#fff") + F("M586 384 L589 394 L593 385 Z M614 384 L611 394 L607 385 Z", "#fff") });
    case "sad":
      return L("M586 388 C594 382 606 382 614 388", 3, R) + L("M590 393 C596 391 604 391 610 393", 1.5, LP, 0.7);
    case "surprise":
      return S("M600 374 C610 374 614 384 612 392 C610 400 606 404 600 404 C594 404 590 400 588 392 C586 384 590 374 600 374 Z", R, { w: 3, rim: false, in: F("M592 396 C596 392 604 392 608 396 C604 402 596 402 592 396 Z", "#c06aa0") });
    case "serious":
      return L("M586 384 C594 386 606 386 614 384", 3, R) + F("M590 386 C596 390 604 390 610 386 C604 392 596 392 590 386 Z", LP, 0.8);
    default: // 고요한 미소(입꼬리 살짝)
      return L("M584 381 C592 386 608 386 616 379", 3, R) + F("M590 386 C596 391 604 391 610 386 C604 393 596 393 590 386 Z", LP, 0.8) + L("M582 379 l-3 -3 M618 377 l3 -3", 2, R, 0.8);
  }
}
function face(ex) {
  let s = "";
  const fc = "M494 250 C490 310 502 350 532 380 C556 402 582 412 600 414 C618 412 644 402 668 380 C698 350 710 310 706 250 C704 180 660 146 600 146 C540 146 496 180 494 250 Z";
  s += S(fc, SK, { sh: SK2, sx: -14, sy: -6, rw: 5, ro: 0.7, w: 4.5,
    in: F("M494 238 C540 266 660 266 706 238 L706 290 C660 270 540 270 494 290 Z", SK3, 0.6)
      + `<ellipse cx="560" cy="250" rx="60" ry="40" fill="#5a4890" opacity=".35"/>` + speck(494, 146, 706, 414, 34, 41, 0.08) });
  const bo = { smile: 0.8, sad: 0.5, surprise: 0.6, angry: 0.3 }[ex] ?? 0.3;
  s += `<ellipse cx="540" cy="356" rx="30" ry="12" fill="url(#nirva-blush)" opacity="${bo}"/><ellipse cx="660" cy="356" rx="30" ry="12" fill="url(#nirva-blush)" opacity="${bo}"/>`;
  // 이마 문양(금빛 별)
  s += L("M604 340 C606 350 605 356 599 360", 2.2, "#0a0616") + F("M604 354 C610 358 610 362 602 364 Z", SK3, 0.8);
  s += eye(552, 312, -1, ex) + eye(648, 312, 1, ex);
  // 금빛 눈 광채
  if (ex === "angry" || ex === "serious") s += `<ellipse cx="552" cy="312" rx="56" ry="34" fill="url(#nirva-gaura)" opacity=".7"/><ellipse cx="648" cy="312" rx="56" ry="34" fill="url(#nirva-gaura)" opacity=".7"/>`;
  s += mouth(ex);
  if (ex === "angry") s += L("M690 210 l10 -14 m-14 6 l14 6 m-6 -16 l2 20", 3, "#ff5ab0");
  if (ex === "surprise") s += L("M720 190 l22 -16 M728 216 l28 -4 M712 166 l8 -24", 3.5, "#f4ecff");
  if (ex === "sad") s += `<path d="M562 340 C554 358 556 372 564 376 C572 372 572 358 562 340 Z" fill="#e6f6ff" stroke="#6aa8e0" stroke-width="2"/>` + L("M524 334 C544 340 562 340 578 334", 1.6, "#bfe4ff", 0.9);
  return s;
}

// ── 앞머리 ───────────────────────────────────────────────────
function frontHair() {
  let s = "";
  // 가운데 가르마, 긴 앞머리가 얼굴을 감쌈
  const cap = "M488 330 C470 220 514 128 600 124 C686 128 730 220 712 330 C706 290 696 254 680 226 C676 262 668 290 650 314 C654 276 646 236 624 206 C618 240 612 262 604 278 C600 248 600 226 600 200 C600 226 600 248 596 278 C588 262 582 240 576 206 C554 236 546 276 550 314 C532 290 524 262 520 226 C504 254 494 290 488 330 Z";
  s += S(cap, "url(#nirva-hairF)", { sh: HS, sx: -18, sy: -4, rw: 8,
    in: F("M690 170 C714 210 720 260 716 320 L730 320 C732 260 722 200 700 160 Z", HD, 0.5)
      + F("M620 206 C640 236 650 272 650 312 L664 290 C660 256 644 226 620 206 Z", HS, 0.6)
      + `<path d="M512 200 C548 172 652 172 690 200 C686 208 680 212 674 210 C640 188 560 188 526 210 C520 210 514 206 512 200 Z" fill="#fff" opacity=".95"/>`
      + F("M540 204 L548 226 L556 206 Z M640 206 L650 226 L658 204 Z", "#fff", 0.9) });
  s += L("M600 130 C600 160 600 190 600 200 M592 134 C560 170 548 230 550 312 M608 134 C640 170 652 230 650 312 M584 140 C534 170 512 250 520 330", 1.8, HD, 0.7);
  // 긴 옆머리(어깨 앞으로 흘러 허리까지, 끝이 떠오름)
  const lLock = "M500 230 C470 300 462 380 470 460 C478 540 452 620 440 700 C430 780 452 860 440 940 C470 900 488 840 486 780 C484 720 500 660 506 600 C512 520 500 440 516 330 Z";
  const rLock = "M700 230 C730 300 738 380 730 460 C722 540 748 620 760 700 C770 780 748 860 760 940 C730 900 712 840 714 780 C716 720 700 660 694 600 C688 520 700 440 684 330 Z";
  s += S(lLock, "url(#nirva-hairF)", { sh: HS, sx: -10, sy: -4, rw: 5, in: L("M496 300 C482 420 486 520 470 620 C458 700 462 800 454 900", 1.6, HD, 0.8) + F("M488 320 C478 400 478 460 482 520 L490 520 C488 460 488 400 496 320 Z", "#fff", 0.8) });
  s += S(rLock, "url(#nirva-hairF)", { sh: HS, sx: -10, sy: -4, rw: 6, in: L("M704 300 C718 420 714 520 730 620 C742 700 738 800 746 900", 1.6, HD, 0.8) });
  // 끝의 결정 구슬
  s += `<path d="M440 940 L452 962 L440 990 L428 962 Z M760 940 L772 962 L760 990 L748 962 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  // 이마 관(써클릿)
  s += S("M500 214 C540 192 660 192 700 214 L698 228 C660 208 540 208 502 228 Z", GD, { sh: GD2, sx: -6, sy: -4, w: 3, rim: false });
  s += S("M600 166 L616 196 L600 226 L584 196 Z", "url(#nirva-crys)", { w: 3, rim: false, in: F("M600 166 L600 226 L584 196 Z", "#fff", 0.6) });
  s += `<path d="M560 200 L568 212 L560 224 L552 212 Z M640 200 L648 212 L640 224 L632 212 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  s += L("M600 226 L600 244", 2, "#ffd25e") + `<path d="M600 244 L606 254 L600 266 L594 254 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="1.6"/>`;
  return s;
}
// 귀(길고 뾰족한, 장식 결정)
function ears() {
  let s = "";
  for (const k of [-1, 1]) {
    const X = (x) => 600 + k * (x - 600);
    const d = `M${X(498)} 300 C${X(476)} 290 ${X(452)} 270 ${X(424)} 240 C${X(436)} 280 ${X(456)} 320 ${X(476)} 344 C${X(486)} 354 ${X(494)} 356 ${X(500)} 352 Z`;
    s += S(d, SK, { sh: SK2, sx: k * 6, sy: -4, w: 3.5, rim: k > 0, rw: 4, in: L(`M${X(490)} 310 C${X(474)} 302 ${X(458)} 288 ${X(440)} 266`, 2, "#0a0616", 0.8) });
    s += L(`M${X(470)} 340 L${X(470)} 380`, 2, "#ffd25e") + `<path d="M${X(470)} 380 L${X(478)} 396 L${X(470)} 420 L${X(462)} 396 Z" fill="url(#nirva-crys)" stroke="${O}" stroke-width="2"/>`;
  }
  return s;
}

function particles() {
  let s = "";
  for (const [x, y, r] of [[140, 1500, 10], [1060, 1420, 8], [1100, 700, 7], [100, 820, 6], [980, 1900, 6], [210, 2000, 7], [1040, 300, 5], [160, 300, 6]]) {
    s += `<path d="${star(x, y, r * 2.2, r * 0.5, 4)}" fill="${AC}" opacity=".7"/><path d="${star(x, y, r * 1.2, r * 0.3, 4)}" fill="#fff"/>`;
  }
  return s;
}

export function svg(expr = "normal") {
  defs = []; uid = 0;
  let b = "";
  b += halo();
  b += ring(RINGS[1], false) + ring(RINGS[0], false);
  b += backHair();
  b += backMembranes();
  b += skirt();
  b += collar();
  b += torso();
  b += armL();
  b += armR();
  b += neck();
  b += shoulders();
  b += sleeveL() + sleeveR();
  b += `<g transform="rotate(3 600 430)">`;
  b += ears();
  b += face(expr);
  b += frontHair();
  b += brow(552, 270, -1, expr) + brow(648, 270, 1, expr);
  b += `</g>`;
  b += ring(RINGS[0], true) + ring(RINGS[1], true);
  b += particles();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${gradients()}${defs.join("")}</defs>${b}</svg>`;
}
