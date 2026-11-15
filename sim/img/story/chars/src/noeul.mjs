// 노을 (XN-0) — 기체 AI 홀로그램 아바타. 발밑 소형 드론 투사기에서 투영되는 주황빛 소녀 형상
// 어두운 배경 + mix-blend-mode:screen 에서도 읽히도록 밝은 선·겹친 반투명 발광으로 구성 (filter 미사용)
export const ID = "noeul", NAME = "노을";

const P = "noeul-";
const f = (n) => Math.round(n * 10) / 10;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 캡슐(손가락 마디) 경로
function capsule(x1, y1, x2, y2, r1, r2 = r1) {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
  return `M${f(x1 + nx * r1)} ${f(y1 + ny * r1)} L${f(x2 + nx * r2)} ${f(y2 + ny * r2)} A${r2} ${r2} 0 0 0 ${f(x2 - nx * r2)} ${f(y2 - ny * r2)} L${f(x1 - nx * r1)} ${f(y1 - ny * r1)} A${r1} ${r1} 0 0 0 ${f(x1 + nx * r1)} ${f(y1 + ny * r1)}Z`;
}
function hexPts(cx, cy, r, rot = -90) {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = ((rot + i * 60) * Math.PI) / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
}
const hexD = (cx, cy, r, rot) => "M" + hexPts(cx, cy, r, rot).map(([x, y]) => `${f(x)} ${f(y)}`).join(" L") + "Z";

// ── 몸 실루엣 (모든 표정 공통) ──
const HEAD = "M494 246 C494 316 514 360 550 394 Q600 436 650 394 C686 360 706 316 706 246 C706 160 662 128 600 128 C538 128 494 160 494 246Z";
const NECK = "M568 392 L632 392 C630 420 634 448 644 466 L556 466 C566 448 570 420 568 392Z";
const TORSO = "M566 452 C520 470 474 478 452 514 C440 545 452 590 478 612 C488 662 494 722 512 790 C524 830 528 850 524 872 C505 920 476 960 470 1000 C466 1048 470 1080 478 1110 L600 1142 L722 1122 C732 1086 735 1050 728 1020 C720 975 690 930 676 876 C672 850 676 830 688 790 C708 720 712 662 722 612 C746 590 762 546 748 506 C728 470 680 470 634 452Z";
const LEG_L = "M474 1040 C460 1200 476 1400 490 1578 C496 1640 480 1700 484 1780 C490 1900 510 2000 516 2090 C518 2150 526 2196 536 2236 C550 2200 560 2150 562 2092 C568 2000 580 1880 576 1762 C574 1700 566 1640 574 1590 C584 1420 600 1262 604 1136Z";
const LEG_R = "M596 1138 C610 1300 620 1450 622 1580 C622 1640 620 1690 630 1760 C646 1880 668 1980 674 2060 C680 2120 692 2168 708 2204 C720 2164 724 2112 720 2060 C714 1960 716 1860 706 1762 C700 1690 690 1640 700 1580 C718 1420 736 1250 728 1030Z";
const ARM_L = "M456 510 C418 536 408 640 404 760 C401 838 392 960 388 1092 L436 1098 C444 982 456 880 464 800 C472 722 480 664 482 612Z";
const ARM_R_UP = "M744 504 C792 530 836 630 868 790 C874 822 862 846 842 850 C820 852 808 836 802 810 C780 730 744 680 722 612Z";
const ARM_R_FORE = "M806 820 C818 760 850 690 880 614 L918 624 C900 700 878 780 866 832 C860 856 812 852 806 820Z";
// 손 (왼쪽: 내려뜨린 손, 오른쪽: 손바닥을 위로 펼친 손)
const HAND_L_PALM = "M388 1088 C380 1110 378 1140 384 1168 C392 1186 420 1190 436 1176 C444 1150 444 1118 436 1094Z";
const HAND_L_FINGERS = [
  capsule(388, 1160, 384, 1200, 9, 8), capsule(384, 1200, 392, 1232, 8, 7),
  capsule(402, 1170, 400, 1214, 9, 8), capsule(400, 1214, 410, 1244, 8, 7),
  capsule(416, 1172, 418, 1210, 8.5, 7.5), capsule(418, 1210, 426, 1236, 7.5, 6.5),
  capsule(430, 1166, 434, 1198, 7.5, 6.5), capsule(434, 1198, 440, 1218, 6.5, 6),
  capsule(436, 1110, 452, 1148, 9, 8), capsule(452, 1148, 450, 1178, 8, 7),
];
const HAND_R_PALM = "M878 610 C870 590 880 566 904 560 C930 556 958 562 966 578 C968 596 950 614 920 624Z";
const HAND_R_FINGERS = [
  capsule(958, 566, 990, 552, 6.2, 5.5), capsule(990, 552, 1008, 534, 5.5, 4.7),
  capsule(950, 560, 978, 538, 6.2, 5.5), capsule(978, 538, 990, 514, 5.5, 4.7),
  capsule(938, 558, 958, 530, 6.2, 5.5), capsule(958, 530, 964, 506, 5.5, 4.7),
  capsule(924, 560, 934, 534, 5.5, 5.1), capsule(934, 534, 934, 514, 5.1, 4.7),
  capsule(886, 586, 872, 556, 6.6, 5.9), capsule(872, 556, 876, 530, 5.9, 5.1),
];
const BODY_PARTS = [LEG_L, LEG_R, TORSO, ARM_L, ARM_R_UP, ARM_R_FORE, HAND_L_PALM, ...HAND_L_FINGERS, HAND_R_PALM, ...HAND_R_FINGERS, NECK];

// ── 머리카락 ──
const HAIR_BACK = "M600 102 C490 102 452 190 458 296 C462 372 470 440 488 492 L512 446 L540 476 L560 438 L600 456 L640 438 L660 476 L688 446 L712 492 C730 440 738 372 742 296 C748 190 710 102 600 102Z";
// 앞머리: 덩어리 끝점 목록(오른쪽 → 왼쪽)
const BANG = [
  [740, 320], [748, 470], [724, 400], [712, 520], [700, 330], [702, 250], [684, 292], [676, 226], [654, 268], [638, 206], [622, 272], [600, 214], [576, 262], [560, 204], [536, 258], [524, 222], [508, 286], [500, 330], [488, 520], [476, 400], [452, 470], [460, 320],
];
function bangPath() {
  let d = `M460 320 C440 190 512 98 600 98 C700 98 762 190 740 320`;
  for (let i = 1; i < BANG.length; i++) {
    const [ax, ay] = BANG[i - 1], [bx, by] = BANG[i];
    if (by > ay) d += ` C${f(ax - 2)} ${f(ay + (by - ay) * 0.45)} ${f(bx + 16)} ${f(by - (by - ay) * 0.35)} ${bx} ${by}`;
    else d += ` C${f(ax + 10)} ${f(ay - (ay - by) * 0.4)} ${f(bx + 4)} ${f(by + (ay - by) * 0.3)} ${bx} ${by}`;
  }
  return d + "Z";
}
const HAIR_FRONT = bangPath();
// 머리카락 결 선
const HAIR_STRANDS = [
  "M600 112 Q566 150 560 204", "M604 112 Q622 170 622 270", "M610 114 Q650 150 676 224", "M590 114 Q540 150 536 256",
  "M620 118 Q690 150 702 248", "M580 116 Q506 160 506 286", "M640 124 Q730 200 712 516", "M560 124 Q470 200 488 516",
  "M612 116 Q646 170 654 266", "M574 118 Q560 170 576 260", "M650 130 Q740 220 746 466", "M550 130 Q460 220 454 466",
];

// 데이터 가닥 끝(머리카락 끝이 픽셀로 흩어짐)
function dataTips(c) {
  const R = rng(77);
  let s = "";
  const tips = [[712, 520, 1], [488, 520, -1], [748, 470, 1], [452, 470, -1], [702, 250, 0], [508, 286, 0], [622, 272, 0], [576, 262, 0]];
  for (const [x, y, dir] of tips) {
    let px = x, py = y + 8;
    const n = dir === 0 ? 2 : (Math.abs(x - 600) < 80 ? 4 : 7);
    for (let i = 0; i < n; i++) {
      const sz = f((dir === 0 ? 7 : 11) - i * (dir === 0 ? 1.6 : 1.3));
      px += (R() - 0.5) * 10 + dir * 3; py += sz + 4 + R() * 6;
      s += `<rect x="${f(px - sz / 2)}" y="${f(py)}" width="${sz}" height="${sz}" fill="${i % 2 ? c.L : c.W}" opacity="${f(0.85 - i * 0.1)}"/>`;
      if (R() > 0.5) s += `<rect x="${f(px + dir * 14 + (R() - 0.5) * 8)}" y="${f(py + 4)}" width="${f(sz * 0.6)}" height="${f(sz * 0.6)}" fill="${c.L}" opacity="${f(0.6 - i * 0.07)}"/>`;
    }
  }
  return s;
}

// 발광 선 (넓은 반투명 + 중간 + 밝은 심)
function glow(d, c, w = 4, core = c.W, extra = "") {
  return `<path d="${d}" fill="none" stroke="${c.M}" stroke-width="${w * 7}" opacity="0.07" stroke-linejoin="round" ${extra}/>` +
    `<path d="${d}" fill="none" stroke="${c.M}" stroke-width="${w * 3}" opacity="0.18" stroke-linejoin="round" ${extra}/>` +
    `<path d="${d}" fill="none" stroke="${core}" stroke-width="${w}" opacity="0.95" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
}
const line = (d, col, w, op = 1, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

// ── 얼굴 ──
const EYE = { L: [548, 300], R: [652, 300] };

function eyeParams(e) {
  // top: 윗꺼풀 높이, inn: 안쪽 처짐, out: 바깥 처짐, bot: 아래꺼풀, ir: 홍채 배율
  return {
    normal: { top: 34, inn: 0, out: 0, bot: 30, ir: 1 },
    smile: { top: 34, inn: 0, out: 0, bot: 30, ir: 1 },
    angry: { top: 22, inn: 14, out: -2, bot: 26, ir: 0.92 },
    sad: { top: 28, inn: -6, out: 10, bot: 30, ir: 1 },
    surprise: { top: 44, inn: -2, out: -2, bot: 34, ir: 0.68 },
    serious: { top: 20, inn: 4, out: 2, bot: 27, ir: 0.95 },
  }[e];
}

function eye(cx, cy, s, e, c, key) {
  // s = -1: 화면 왼쪽 눈(바깥쪽이 -x), s = 1: 오른쪽 눈
  const p = eyeParams(e);
  const ox = cx + s * 40, oy = cy + 4 + p.out, ix = cx - s * 32, iy = cy - 6 + p.inn;
  let o = `<g transform="translate(${cx} ${cy}) scale(1.16) translate(${-cx} ${-cy})">`;
  if (e === "smile") {
    // 눈웃음 (^ 모양)
    const d = `M${ox} ${cy + 10} C${cx + s * 30} ${cy - 22} ${cx - s * 18} ${cy - 24} ${ix} ${cy + 6}`;
    o += glow(d, c, 7);
    o += line(`M${ox} ${cy + 10} l${s * 12} ${4}`, c.W, 5);
    o += line(`M${cx + s * 26} ${cy + 22} Q${cx} ${cy + 30} ${cx - s * 20} ${cy + 22}`, c.L, 2.5, 0.6);
    return o + "</g>";
  }
  const upper = `M${ox} ${oy} C${cx + s * 36} ${cy - p.top + 8 + p.out * 0.5} ${cx - s * 6} ${cy - p.top - 2 + p.inn * 0.6} ${ix} ${iy}`;
  const lower = `Q${cx - s * 2} ${cy + p.bot + 4} ${ox} ${oy}`;
  const shape = `${upper} ${lower}Z`;
  o += `<clipPath id="${P}eye${key}"><path d="${shape}"/></clipPath>`;
  // 흰자(밝은 반투명)
  o += `<path d="${shape}" fill="${c.L}" opacity="0.32"/>`;
  o += `<g clip-path="url(#${P}eye${key})">`;
  const irx = 23 * p.ir, iry = 29 * p.ir, icx = cx - s * 2, icy = cy + 3;
  o += `<ellipse cx="${icx}" cy="${icy}" rx="${irx + 2}" ry="${iry + 2}" fill="${c.D}" opacity="0.9"/>`;
  o += `<ellipse cx="${icx}" cy="${icy}" rx="${irx}" ry="${iry}" fill="url(#${P}iris)"/>`;
  o += `<ellipse cx="${icx}" cy="${icy + 2}" rx="${f(irx * 0.42)}" ry="${f(iry * 0.46)}" fill="${c.D}" opacity="0.95"/>`;
  // 홍채 안 링 무늬(기계적 조리개)
  o += `<ellipse cx="${icx}" cy="${icy + 2}" rx="${f(irx * 0.7)}" ry="${f(iry * 0.72)}" fill="none" stroke="${c.W}" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.6"/>`;
  // 윗꺼풀 그림자
  o += `<path d="${upper} L${ix} ${cy - 50} L${ox} ${cy - 50}Z" fill="${c.D}" opacity="0.35" transform="translate(0 10)"/>`;
  // 하이라이트
  o += `<ellipse cx="${icx - 9}" cy="${icy - 12 * p.ir}" rx="${f(8 * p.ir + 1)}" ry="${f(10 * p.ir + 1)}" fill="#ffffff"/>`;
  o += `<circle cx="${icx + 10}" cy="${icy + 14 * p.ir}" r="4" fill="#ffffff" opacity="0.9"/>`;
  o += `<circle cx="${icx + 13}" cy="${icy - 6}" r="2.4" fill="#ffffff" opacity="0.85"/>`;
  o += `</g>`;
  // 윗 속눈썹(굵게) + 꼬리
  o += glow(upper, c, 6.5);
  o += `<path d="M${ox} ${oy} l${s * 14} ${-8} l${-s * 6} ${10}Z" fill="${c.W}"/>`;
  o += line(`M${cx + s * 30} ${cy - p.top + 10} l${s * 10} ${-8}`, c.W, 3.5);
  // 아래 속눈썹(가늘게)
  o += line(`M${cx + s * 32} ${cy + p.bot - 6 + p.out} Q${cx} ${cy + p.bot + 6} ${cx - s * 18} ${cy + p.bot - 4}`, c.L, 2.4, 0.85);
  // 쌍꺼풀
  o += line(`M${cx + s * 34} ${cy - p.top - 2 + p.out} Q${cx + s * 4} ${cy - p.top - 16 + p.inn * 0.4} ${cx - s * 22} ${cy - p.top - 4 + p.inn}`, c.L, 2, 0.7);
  if (e === "surprise") o += line(`M${cx + s * 44} ${cy - 30} l${s * 10} -6 M${cx + s * 46} ${cy - 16} l${s * 12} -2`, c.L, 2.5, 0.8);
  return o + "</g>";
}

function brows(e, c) {
  const B = {
    normal: [[-26, -54], [42, -58], 8],
    smile: [[-26, -60], [42, -64], 10],
    angry: [[-24, -36], [44, -62], -6],
    sad: [[-24, -68], [44, -46], 6],
    surprise: [[-26, -76], [42, -80], 12],
    serious: [[-26, -46], [44, -52], 2],
  }[e];
  let o = "";
  for (const [k, s] of [["L", -1], ["R", 1]]) {
    const [cx, cy] = EYE[k];
    const ix = cx - s * -B[0][0] * -1, iy = cy + B[0][1];
    const inx = cx + s * B[0][0], ox = cx + s * B[1][0], oy = cy + B[1][1];
    const mx = (inx + ox) / 2, my = (iy + oy) / 2 - B[2];
    const d = `M${inx} ${iy + 4} Q${f(mx)} ${f(my)} ${ox} ${oy} Q${f(mx)} ${f(my - 7)} ${inx} ${iy - 4}Z`;
    o += `<path d="${d}" fill="${c.W}" stroke="${c.M}" stroke-width="2" opacity="0.95"/>`;
    o += `<path d="${d}" fill="none" stroke="${c.M}" stroke-width="12" opacity="0.15"/>`;
    void ix;
  }
  return o;
}

function mouth(e, c) {
  switch (e) {
    case "smile":
      return `<path d="M572 368 Q600 374 628 368 Q622 404 600 406 Q578 404 572 368Z" fill="${c.D}" opacity="0.85"/>` +
        `<path d="M584 392 Q600 384 616 392 Q610 404 600 405 Q590 404 584 392Z" fill="${c.M}" opacity="0.9"/>` +
        glow("M572 368 Q600 374 628 368 Q622 404 600 406 Q578 404 572 368Z", c, 2.5) +
        `<path d="M578 371 Q600 376 622 371 L620 378 Q600 382 580 378Z" fill="${c.W}" opacity="0.9"/>`;
    case "angry":
      return `<path d="M574 390 Q600 370 626 390 Q600 384 574 390Z" fill="${c.D}" opacity="0.9"/>` +
        `<path d="M578 388 Q600 374 622 388 L620 384 Q600 372 580 384Z" fill="${c.W}" opacity="0.9"/>` +
        glow("M574 390 Q600 370 626 390", c, 3) + line("M576 392 Q600 386 624 392", c.L, 2, 0.7) +
        line("M588 380 L588 388 M600 376 L600 386 M612 380 L612 388", c.D, 1.5, 0.8);
    case "sad":
      return glow("M584 390 Q592 382 600 384 Q608 382 616 390", c, 3) + line("M594 398 Q600 400 606 398", c.L, 2, 0.5);
    case "surprise":
      return `<ellipse cx="600" cy="390" rx="12" ry="17" fill="${c.D}" opacity="0.9"/>` +
        `<ellipse cx="600" cy="396" rx="7" ry="8" fill="${c.M}" opacity="0.8"/>` + glow("M588 390 A12 17 0 1 0 612 390 A12 17 0 1 0 588 390", c, 3);
    case "serious":
      return glow("M584 384 Q600 386 616 383", c, 3) + line("M594 394 Q600 396 606 394", c.L, 2, 0.45);
    default:
      return glow("M582 378 Q600 390 618 377", c, 3) + line("M594 392 Q600 394 606 392", c.L, 2, 0.45);
  }
}

function faceExtras(e, c) {
  let o = "";
  // 홍조(빗금)
  if (e === "smile" || e === "surprise" || e === "sad") {
    const op = e === "smile" ? 0.5 : 0.32;
    for (const x of [522, 678]) {
      o += `<ellipse cx="${x}" cy="352" rx="30" ry="13" fill="#ff6a7a" opacity="${op * 0.6}"/>`;
      o += line(`M${x - 18} 360 l10 -14 M${x - 6} 362 l10 -14 M${x + 6} 362 l10 -14`, "#ffd0d0", 2, op + 0.2);
    }
  }
  if (e === "sad") {
    for (const [x, s] of [[EYE.L[0] - 26, -1], [EYE.R[0] + 30, 1]]) {
      const y = 330;
      o += `<path d="M${x} ${y} Q${x - 9 * s} ${y + 20} ${x} ${y + 30} Q${x + 9 * s * -1} ${y + 20} ${x} ${y}Z" fill="${c.W}" opacity="0.6"/>`;
      o += `<path d="M${x} ${y} C${x - 10} ${y + 18} ${x - 10} ${y + 30} ${x} ${y + 32} C${x + 10} ${y + 30} ${x + 10} ${y + 18} ${x} ${y}Z" fill="#cfeeff" opacity="0.55" stroke="#ffffff" stroke-width="2"/>`;
      o += `<circle cx="${x - 3}" cy="${y + 24}" r="3" fill="#fff"/>`;
    }
    o += line(`M${EYE.L[0] + 20} ${EYE.L[1] + 28} q-20 4 -40 -2`, "#cfeeff", 3, 0.8);
    o += line(`M${EYE.R[0] - 20} ${EYE.R[1] + 28} q20 4 40 -2`, "#cfeeff", 3, 0.8);
  }
  if (e === "surprise") {
    o += `<path d="M726 216 C718 236 716 248 726 254 C736 248 734 236 726 216Z" fill="#cfeeff" opacity="0.7" stroke="#fff" stroke-width="2"/>`;
    o += line("M740 170 l18 -14 M750 196 l22 -4 M730 146 l6 -20", c.W, 3, 0.8);
  }
  if (e === "angry") {
    // 분노 글리치 + 혈관 기호
    o += line("M700 170 l14 14 m0 -14 l-14 14 M712 156 q10 -6 18 2 M690 160 q-8 -10 2 -18", "#ff3a2a", 4, 0.9);
  }
  if (e === "serious") {
    o += line("M500 268 L520 268 M680 268 L700 268", c.L, 1.5, 0.5);
  }
  return o;
}

function face(e, c) {
  let o = "";
  // 코
  o += line("M606 336 Q610 346 602 350", c.L, 2.4, 0.8) + `<circle cx="596" cy="338" r="2.5" fill="${c.W}" opacity="0.7"/>`;
  o += eye(EYE.L[0], EYE.L[1], -1, e, c, "L") + eye(EYE.R[0], EYE.R[1], 1, e, c, "R");
  o += brows(e, c) + mouth(e, c) + faceExtras(e, c);
  return o;
}

// ── 바디수트 디테일 ──
function suitDetails(c) {
  let o = "";
  // 하이넥 칼라
  o += `<path d="M556 452 Q600 474 644 452 L650 478 Q600 500 550 478Z" fill="${c.M}" opacity="0.45"/>`;
  o += glow("M556 452 Q600 474 644 452 M550 478 Q600 500 650 478", c, 2.5);
  // 어깨 패널
  o += glow("M466 508 Q520 498 566 486 M734 500 Q680 496 634 486", c, 2.2, c.L);
  o += glow("M462 530 C482 560 490 590 486 612 M740 526 C722 556 714 588 718 612", c, 2, c.L);
  // 가슴 코어 (육각)
  o += `<path d="${hexD(600, 600, 30)}" fill="${c.M}" opacity="0.35"/>` + glow(hexD(600, 600, 30), c, 3);
  o += `<path d="${hexD(600, 600, 16)}" fill="${c.W}" opacity="0.9"/>`;
  o += `<circle cx="600" cy="600" r="60" fill="url(#${P}core)"/>`;
  // 가슴선(아래)
  o += line("M514 690 Q552 716 590 692 M610 692 Q648 716 686 688", c.L, 2.4, 0.75);
  // 가운데 솔기 + 회로
  o += glow("M600 632 L600 700 M556 492 L578 574 M644 492 L622 574", c, 1.8, c.L);
  o += glow("M488 620 C530 700 560 790 590 880 M712 620 C670 700 640 790 610 880", c, 2.2, c.L);
  o += line("M500 700 C520 760 536 820 548 876 M700 700 C680 760 664 820 652 876", c.L, 1.4, 0.45);
  for (const [x, y] of [[600, 700], [556, 492], [644, 492]]) o += `<circle cx="${x}" cy="${y}" r="5" fill="${c.W}"/><circle cx="${x}" cy="${y}" r="11" fill="${c.M}" opacity="0.3"/>`;
  // 허리 벨트 라인
  o += `<path d="M522 880 Q600 904 678 880 L690 920 Q600 948 506 922Z" fill="${c.M}" opacity="0.3"/>`;
  o += glow("M522 880 Q600 904 678 880 M506 922 Q600 948 690 920", c, 2.6);
  o += `<path d="${hexD(600, 918, 16, 0)}" fill="${c.W}" opacity="0.85"/>` + glow(hexD(600, 918, 22, 0), c, 2);
  // 골반 패널(하이컷 라인)
  o += glow("M488 960 C520 1010 560 1080 600 1140 C640 1080 680 1010 712 965", c, 2.4, c.L);
  o += line("M500 1000 C530 1040 560 1090 584 1130 M700 1004 C672 1044 642 1090 616 1130", c.L, 1.6, 0.5);
  // 다리: 사이하이 부츠 경계
  o += glow("M480 1480 Q530 1500 586 1470 M618 1470 Q668 1494 720 1468", c, 2.8);
  o += `<path d="M480 1480 Q530 1500 586 1470 L584 1500 Q530 1530 482 1510Z" fill="${c.M}" opacity="0.4"/>`;
  o += `<path d="M618 1470 Q668 1494 720 1468 L716 1498 Q668 1524 620 1500Z" fill="${c.M}" opacity="0.4"/>`;
  // 무릎 보호 육각
  o += `<path d="${hexD(532, 1600, 30)}" fill="${c.M}" opacity="0.35"/>` + glow(hexD(532, 1600, 30), c, 2.4) + glow(hexD(532, 1600, 14), c, 1.6, c.L);
  o += `<path d="${hexD(662, 1598, 30)}" fill="${c.M}" opacity="0.35"/>` + glow(hexD(662, 1598, 30), c, 2.4) + glow(hexD(662, 1598, 14), c, 1.6, c.L);
  // 정강이 라인
  o += glow("M508 1660 C500 1760 510 1900 528 2050 M556 1660 C570 1780 566 1920 552 2060", c, 1.6, c.L);
  o += glow("M640 1660 C650 1760 670 1900 686 2040 M688 1660 C700 1780 712 1920 710 2040", c, 1.6, c.L);
  o += line("M498 1820 Q530 1832 572 1818 M504 1940 Q534 1950 566 1938 M640 1820 Q672 1834 708 1820 M656 1940 Q686 1950 712 1938", c.L, 1.8, 0.6);
  // 발목 링
  o += glow("M514 2080 Q540 2094 564 2080 M672 2054 Q698 2066 720 2052", c, 2.6);
  // 팔: 장갑 경계 + 팔꿈치
  o += glow("M398 960 Q414 972 442 962 M392 1040 Q414 1050 438 1040", c, 2.2);
  o += `<path d="M398 960 Q414 972 442 962 L438 1040 Q414 1050 392 1040Z" fill="${c.M}" opacity="0.3"/>`;
  o += glow("M410 820 Q436 836 462 818", c, 2, c.L);
  o += glow("M812 806 Q836 830 866 812", c, 2, c.L);
  o += glow("M878 660 Q896 672 912 664 M866 708 Q884 720 902 712", c, 2.2);
  o += `<path d="M878 660 Q896 672 912 664 L902 712 Q884 720 866 708Z" fill="${c.M}" opacity="0.3"/>`;
  o += glow("M464 560 C448 640 440 720 432 800 M740 560 C772 620 800 700 830 790", c, 1.5, c.L);
  return o;
}

// 육각 무늬 패턴
function hexPattern(c) {
  const s = 22, w = Math.sqrt(3) * s, h = 3 * s;
  const a = hexD(w / 2, s, s), b = hexD(0, s * 2.5, s), b2 = hexD(w, s * 2.5, s);
  return `<pattern id="${P}hex" width="${f(w)}" height="${h}" patternUnits="userSpaceOnUse"><path d="${a} ${b} ${b2}" fill="none" stroke="${c.W}" stroke-width="1.2" opacity="0.5"/></pattern>`;
}

function halo(c) {
  let o = "";
  const cx = 600, cy = 270;
  o += `<circle cx="${cx}" cy="${cy}" r="300" fill="url(#${P}aura)"/>`;
  o += glow(hexD(cx, cy, 262, -90), c, 3.5, c.L);
  o += line(hexD(cx, cy, 246, -90), c.M, 1.5, 0.6, `stroke-dasharray="30 10 4 10"`);
  o += line(hexD(cx, cy, 284, -90), c.L, 1.2, 0.45, `stroke-dasharray="2 12"`);
  // 꼭짓점 노드
  for (const [x, y] of hexPts(cx, cy, 262)) {
    o += `<circle cx="${f(x)}" cy="${f(y)}" r="9" fill="${c.W}"/><circle cx="${f(x)}" cy="${f(y)}" r="20" fill="${c.M}" opacity="0.25"/>`;
    o += `<path d="${hexD(x, y, 16)}" fill="none" stroke="${c.L}" stroke-width="1.5" opacity="0.7"/>`;
  }
  // 회전 눈금 고리
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180, r1 = 312, r2 = i % 6 === 0 ? 334 : 322;
    if (i % 18 > 13) continue;
    o += `<path d="M${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))} L${f(cx + r2 * Math.cos(a))} ${f(cy + r2 * Math.sin(a))}" stroke="${c.L}" stroke-width="${i % 6 === 0 ? 3 : 1.5}" opacity="0.55"/>`;
  }
  // 호 조각
  const arc = (r, a0, a1, w, op) => {
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    return line(`M${f(p0[0])} ${f(p0[1])} A${r} ${r} 0 0 1 ${f(p1[0])} ${f(p1[1])}`, c.L, w, op);
  };
  o += arc(350, -2.6, -1.9, 3, 0.7) + arc(350, -1.2, -0.5, 3, 0.7) + arc(362, -2.4, -2.1, 6, 0.5) + arc(362, -0.9, -0.7, 6, 0.5);
  o += arc(350, 0.4, 0.9, 2, 0.35) + arc(350, 2.2, 2.7, 2, 0.35);
  // 작은 글자 같은 데이터 표식
  const R = rng(5);
  for (let k = 0; k < 2; k++) {
    const x0 = k ? 836 : 300, y0 = 150;
    for (let i = 0; i < 6; i++) {
      const wdt = 20 + R() * 40;
      o += `<rect x="${f(k ? x0 : x0 - wdt)}" y="${y0 + i * 12}" width="${f(wdt)}" height="4" fill="${c.L}" opacity="${f(0.35 + R() * 0.3)}"/>`;
    }
  }
  o += `<path d="M${cx - 60} ${cy - 290} L${cx + 60} ${cy - 290} M${cx - 30} ${cy - 302} L${cx + 30} ${cy - 302}" stroke="${c.W}" stroke-width="3" opacity="0.7"/>`;
  return o;
}

function emitter(c) {
  let o = "";
  // 투사 빛기둥
  o += `<path d="M584 2312 L440 2150 Q600 2110 770 2150 L616 2312Z" fill="url(#${P}beam)"/>`;
  o += `<path d="M592 2312 L500 2120 L700 2120 L608 2312Z" fill="url(#${P}beam)" opacity="0.8"/>`;
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x0 = 600 + (t - 0.5) * 24, x1 = 450 + t * 310;
    o += line(`M${f(x0)} 2310 L${f(x1)} 2150`, c.L, 1.2, 0.25);
  }
  // 투사 고리
  o += `<ellipse cx="620" cy="2222" rx="150" ry="22" fill="none" stroke="${c.L}" stroke-width="2.5" opacity="0.6"/>`;
  o += `<ellipse cx="620" cy="2222" rx="120" ry="16" fill="${c.M}" opacity="0.12"/>`;
  o += `<ellipse cx="608" cy="2268" rx="90" ry="12" fill="none" stroke="${c.L}" stroke-width="2" opacity="0.55" stroke-dasharray="14 8"/>`;
  // 드론 본체
  const ink = "#1a1626";
  o += `<g stroke="${ink}" stroke-width="4" stroke-linejoin="round">`;
  // 팔
  o += `<path d="M520 2338 L430 2322 L428 2338 L518 2356Z M680 2338 L770 2322 L772 2338 L682 2356Z" fill="#3a3a4c"/>`;
  // 로터
  o += `<ellipse cx="420" cy="2324" rx="56" ry="10" fill="#9aa6c0" opacity="0.35"/><ellipse cx="780" cy="2324" rx="56" ry="10" fill="#9aa6c0" opacity="0.35"/>`;
  o += `<rect x="410" y="2318" width="20" height="26" rx="5" fill="#2a2a38"/><rect x="770" y="2318" width="20" height="26" rx="5" fill="#2a2a38"/>`;
  o += `<path d="M512 2320 L536 2300 L664 2300 L688 2320 L676 2370 L524 2370Z" fill="url(#${P}drone)"/>`;
  o += `<path d="M524 2370 L676 2370 L660 2390 L540 2390Z" fill="#232331"/>`;
  o += `</g>`;
  o += line("M530 2322 L670 2322", "#ffffff", 2, 0.25);
  o += line("M540 2306 L556 2306", "#ffffff", 3, 0.5);
  // 렌즈
  o += `<ellipse cx="600" cy="2308" rx="34" ry="10" fill="#1a1626"/>`;
  o += `<ellipse cx="600" cy="2306" rx="26" ry="7" fill="${c.M}"/><ellipse cx="600" cy="2305" rx="14" ry="4" fill="${c.W}"/>`;
  o += `<ellipse cx="600" cy="2304" rx="70" ry="22" fill="${c.M}" opacity="0.25"/>`;
  // 상태등 + 마킹
  o += `<rect x="550" y="2342" width="22" height="6" rx="3" fill="${c.M}"/><rect x="580" y="2342" width="8" height="6" rx="3" fill="${c.W}"/>`;
  o += `<path d="M626 2340 l12 0 l6 8 l-12 0Z M646 2340 l12 0 l6 8 l-12 0Z" fill="#8fe8ff" opacity="0.75"/>`;
  o += line("M680 2330 L684 2312", "#8fe8ff", 2.5, 0.8);
  return o;
}

function particles(c) {
  const R = rng(2024);
  let o = "";
  for (let i = 0; i < 90; i++) {
    const x = 120 + R() * 960, y = 120 + R() * 2160;
    // 몸 중앙부는 피함
    if (Math.abs(x - 600) < 160 && y > 400 && y < 2150 && R() > 0.25) continue;
    const t = R();
    const op = f(0.25 + R() * 0.6);
    if (t < 0.45) o += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + R() * 3)}" fill="${c.W}" opacity="${op}"/>`;
    else if (t < 0.75) { const sz = f(4 + R() * 8); o += `<rect x="${f(x)}" y="${f(y)}" width="${sz}" height="${sz}" fill="none" stroke="${c.L}" stroke-width="1.5" opacity="${op}"/>`; }
    else if (t < 0.9) o += `<path d="${hexD(x, y, 6 + R() * 10)}" fill="${c.M}" fill-opacity="0.15" stroke="${c.L}" stroke-width="1.5" opacity="${op}"/>`;
    else { const l = 30 + R() * 80; o += line(`M${f(x)} ${f(y)} L${f(x)} ${f(y - l)}`, c.L, 1.5, f(op * 0.6)); }
  }
  // 반짝임 (십자)
  for (const [x, y, s] of [[330, 760, 16], [880, 980, 12], [270, 1500, 10], [930, 1760, 14], [820, 360, 10], [380, 2040, 12]]) {
    o += `<path d="M${x} ${y - s} Q${x + 2} ${y - 2} ${x + s} ${y} Q${x + 2} ${y + 2} ${x} ${y + s} Q${x - 2} ${y + 2} ${x - s} ${y} Q${x - 2} ${y - 2} ${x} ${y - s}Z" fill="${c.W}" opacity="0.85"/>`;
  }
  return o;
}

// 손바닥 위의 작은 홀로 큐브(호기심)
// 허리에서 흐르는 빛의 리본 + 비대칭 하프스커트 패널 (back=true: 몸 뒤쪽 레이어)
function ribbons(c, back) {
  let o = "";
  if (back) {
    // 뒤로 흐르는 긴 리본 두 가닥
    const rb = [
      "M520 900 C470 1000 380 1100 360 1260 C340 1420 400 1560 360 1720 C340 1800 300 1860 270 1900 C320 1850 372 1790 392 1720 C432 1560 378 1420 396 1270 C414 1130 500 1020 548 920Z",
      "M680 900 C740 1000 830 1120 846 1280 C862 1440 800 1580 842 1740 C860 1810 900 1870 930 1910 C880 1866 830 1800 812 1740 C772 1590 828 1440 812 1290 C798 1150 712 1020 652 920Z",
    ];
    for (const d of rb) o += `<path d="${d}" fill="url(#${P}ribbon)" opacity="0.55"/>` + glow(d, c, 2.4, c.L);
    o += line("M536 912 C470 1030 396 1130 378 1265 C362 1420 412 1560 376 1720 C362 1790 330 1850 300 1890", c.W, 1.6, 0.55, `stroke-dasharray="16 10 3 10"`);
    o += line("M666 912 C730 1030 812 1140 830 1285 C846 1440 788 1580 826 1740 C840 1800 870 1856 900 1896", c.W, 1.6, 0.55, `stroke-dasharray="16 10 3 10"`);
    // 뒤쪽 스커트 패널(다리 사이로 보임)
    o += `<path d="M520 930 Q600 960 680 930 L700 1200 Q600 1240 500 1200Z" fill="${c.M}" opacity="0.14"/>`;
    return o;
  }
  // 앞쪽: 비대칭 하프스커트 (양 옆이 열린 빛 패널)
  const panels = [
    "M508 922 C486 980 456 1060 440 1150 L470 1170 L500 1140 L524 1160 C530 1080 540 1000 548 934Z",
    "M688 920 C716 980 752 1070 776 1180 L746 1206 L718 1176 L690 1200 C680 1110 668 1010 652 934Z",
    "M652 934 C668 1010 680 1110 690 1200 L670 1230 L650 1200 C646 1110 634 1020 620 942Z",
  ];
  for (const d of panels) o += `<path d="${d}" fill="url(#${P}ribbon)" opacity="0.6"/>` + glow(d, c, 2.6);
  o += line("M500 980 L466 1130 M716 990 L752 1160 M660 980 L676 1180", c.W, 1.4, 0.5, `stroke-dasharray="10 8"`);
  for (const [x, y] of [[470, 1170], [746, 1206], [670, 1230], [500, 1140], [718, 1176]]) o += `<path d="${hexD(x, y + 14, 7)}" fill="${c.W}" opacity="0.85"/>` + line(`M${x} ${y} L${x} ${y + 7}`, c.L, 1.5, 0.7);
  return o;
}

function palmHolo(c) {
  let o = "";
  const cx = 950, cy = 430;
  o += `<circle cx="${cx}" cy="${cy}" r="90" fill="url(#${P}aura)"/>`;
  o += `<path d="M${cx - 30} 548 L${cx - 50} ${cy + 30} L${cx + 50} ${cy + 30} L${cx + 30} 548Z" fill="url(#${P}beam2)"/>`;
  o += `<path d="${hexD(cx, cy, 46)}" fill="${c.M}" opacity="0.2"/>` + glow(hexD(cx, cy, 46), c, 3);
  o += glow(`M${cx} ${cy} L${cx} ${cy - 46} M${cx} ${cy} L${f(cx - 39.8)} ${cy + 23} M${cx} ${cy} L${f(cx + 39.8)} ${cy + 23}`, c, 2, c.L);
  o += `<path d="M${cx} ${cy - 46} L${f(cx + 39.8)} ${cy - 23} L${cx} ${cy} L${f(cx - 39.8)} ${cy - 23}Z" fill="${c.W}" opacity="0.35"/>`;
  o += `<ellipse cx="${cx}" cy="${cy + 64}" rx="54" ry="10" fill="none" stroke="${c.L}" stroke-width="2" opacity="0.6"/>`;
  o += `<ellipse cx="${cx}" cy="${cy}" rx="78" ry="20" fill="none" stroke="${c.L}" stroke-width="1.5" opacity="0.5" stroke-dasharray="6 6" transform="rotate(-18 ${cx} ${cy})"/>`;
  return o;
}

export function svg(expr = "normal") {
  const e = ["normal", "smile", "angry", "sad", "surprise", "serious"].includes(expr) ? expr : "normal";
  const c = e === "angry"
    ? { M: "#ff5a30", L: "#ffb898", W: "#fff1ea", D: "#b8261a", F: "#ff7a50", K: "#5a0e0a" }
    : { M: "#ff9a3a", L: "#ffd3a0", W: "#fff6e8", D: "#c4500f", F: "#ffae5a", K: "#5e1f04" };

  const defs = `<defs>
<linearGradient id="${P}body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.L}"/><stop offset="0.35" stop-color="${c.M}"/><stop offset="0.8" stop-color="${c.M}"/><stop offset="1" stop-color="${c.W}"/></linearGradient>
<linearGradient id="${P}side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.W}" stop-opacity="0.55"/><stop offset="0.25" stop-color="${c.M}" stop-opacity="0"/><stop offset="0.8" stop-color="${c.D}" stop-opacity="0"/><stop offset="1" stop-color="${c.D}" stop-opacity="0.55"/></linearGradient>
<linearGradient id="${P}hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.W}"/><stop offset="0.3" stop-color="${c.F}"/><stop offset="0.75" stop-color="${c.M}"/><stop offset="1" stop-color="${c.D}"/></linearGradient>
<linearGradient id="${P}iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.K}"/><stop offset="0.35" stop-color="${c.D}"/><stop offset="0.7" stop-color="${c.M}"/><stop offset="0.9" stop-color="#ffe08a"/><stop offset="1" stop-color="${c.W}"/></linearGradient>
<linearGradient id="${P}face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.L}"/><stop offset="1" stop-color="${c.F}"/></linearGradient>
<linearGradient id="${P}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.W}" stop-opacity="0.75"/><stop offset="0.5" stop-color="${c.M}" stop-opacity="0.25"/><stop offset="1" stop-color="${c.M}" stop-opacity="0"/></linearGradient>
<linearGradient id="${P}beam2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.W}" stop-opacity="0.6"/><stop offset="1" stop-color="${c.M}" stop-opacity="0"/></linearGradient>
<linearGradient id="${P}ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.W}" stop-opacity="0.75"/><stop offset="0.4" stop-color="${c.M}" stop-opacity="0.45"/><stop offset="1" stop-color="${c.M}" stop-opacity="0.08"/></linearGradient>
<linearGradient id="${P}drone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5c72"/><stop offset="0.4" stop-color="#3b3c50"/><stop offset="1" stop-color="#22222e"/></linearGradient>
<linearGradient id="${P}fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.86" stop-color="#fff"/><stop offset="0.93" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0.15"/></linearGradient>
<radialGradient id="${P}aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c.M}" stop-opacity="0.32"/><stop offset="0.6" stop-color="${c.M}" stop-opacity="0.1"/><stop offset="1" stop-color="${c.M}" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}core" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${c.W}" stop-opacity="0.7"/><stop offset="1" stop-color="${c.M}" stop-opacity="0"/></radialGradient>
<radialGradient id="${P}bodyAura" cx="0.5" cy="0.45" r="0.5"><stop offset="0" stop-color="${c.M}" stop-opacity="0.22"/><stop offset="1" stop-color="${c.M}" stop-opacity="0"/></radialGradient>
<pattern id="${P}scan" width="12" height="9" patternUnits="userSpaceOnUse"><rect width="12" height="3" fill="${c.W}" opacity="0.32"/></pattern>
${hexPattern(c)}
<clipPath id="${P}bodyClip">${BODY_PARTS.map((d) => `<path d="${d}"/>`).join("")}<path d="${HEAD}"/><path d="${HAIR_BACK}"/><path d="${HAIR_FRONT}"/></clipPath>
<clipPath id="${P}suitClip"><path d="${TORSO}"/><path d="${LEG_L}"/><path d="${LEG_R}"/><path d="${ARM_L}"/><path d="${ARM_R_UP}"/><path d="${ARM_R_FORE}"/></clipPath>
<clipPath id="${P}hairClip"><path d="${HAIR_FRONT}"/></clipPath>
<mask id="${P}fadeMask"><rect x="0" y="0" width="1200" height="2400" fill="url(#${P}fade)"/></mask>
</defs>`;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400">${defs}`;
  // 배경 광륜/오라
  s += `<ellipse cx="600" cy="1250" rx="520" ry="1150" fill="url(#${P}bodyAura)"/>`;
  s += halo(c);
  s += particles(c);

  s += `<g mask="url(#${P}fadeMask)">`;
  // 뒷머리
  s += `<path d="${HAIR_BACK}" fill="url(#${P}hair)" opacity="0.5"/>` + glow(HAIR_BACK, c, 3, c.L);
  // 몸 채움 (그룹 투명도로 겹침 없이)
  s += `<g opacity="0.3">${BODY_PARTS.map((d) => `<path d="${d}" fill="url(#${P}body)"/>`).join("")}</g>`;
  s += `<g clip-path="url(#${P}bodyClip)" opacity="0.5">${[LEG_L, LEG_R, TORSO, ARM_L, ARM_R_UP, ARM_R_FORE].map((d) => `<path d="${d}" fill="none" stroke="${c.M}" stroke-width="44"/>`).join("")}</g>`;
  s += ribbons(c, true);
  s += `<g opacity="0.9">${BODY_PARTS.map((d) => `<path d="${d}" fill="url(#${P}side)"/>`).join("")}</g>`;
  // 육각 무늬·스캔라인 (실루엣 안)
  s += `<g clip-path="url(#${P}suitClip)"><rect x="300" y="440" width="700" height="1800" fill="url(#${P}hex)" opacity="0.55"/></g>`;
  // 바디 외곽선
  for (const d of [LEG_L, LEG_R, TORSO, ARM_L, ARM_R_UP, ARM_R_FORE, NECK]) s += glow(d, c, 4);
  for (const d of [HAND_L_PALM, ...HAND_L_FINGERS, HAND_R_PALM, ...HAND_R_FINGERS]) s += `<path d="${d}" fill="none" stroke="${c.M}" stroke-width="10" opacity="0.15"/><path d="${d}" fill="none" stroke="${c.W}" stroke-width="2.6" stroke-linejoin="round"/>`;
  // 손톱/손등 하이라이트
  s += line("M396 1110 Q392 1140 398 1160 M904 572 Q930 566 952 572", c.W, 2, 0.6);
  s += suitDetails(c);
  // 얼굴
  s += `<path d="${HEAD}" fill="url(#${P}face)" opacity="0.5"/>`;
  s += `<path d="M700 260 C700 330 676 372 640 398 C672 360 690 320 690 260Z" fill="${c.D}" opacity="0.35"/>`;
  s += glow(HEAD, c, 4);
  // 귀 센서 핀
  for (const [x, s2] of [[486, -1], [714, 1]]) {
    s += `<path d="M${x} 262 L${x + s2 * 26} 250 L${x + s2 * 34} 300 L${x + s2 * 20} 330 L${x} 322Z" fill="${c.M}" opacity="0.4"/>` + glow(`M${x} 262 L${x + s2 * 26} 250 L${x + s2 * 34} 300 L${x + s2 * 20} 330 L${x} 322Z`, c, 2.5);
    s += line(`M${x + s2 * 28} 252 L${x + s2 * 60} 210 L${x + s2 * 64} 180`, c.W, 3, 0.9) + `<circle cx="${x + s2 * 64}" cy="178" r="5" fill="${c.W}"/>`;
    s += `<rect x="${x + s2 * 14 - 3}" y="280" width="6" height="22" rx="3" fill="${c.W}"/>`;
  }
  s += `<g transform="rotate(-3 600 400)">` + face(e, c) + `</g>`;
  // 앞머리
  s += `<path d="${HAIR_FRONT}" fill="url(#${P}hair)" opacity="0.62"/>`;
  s += `<g clip-path="url(#${P}hairClip)">`;
  s += `<path d="M482 222 C520 168 680 160 724 214 C680 178 524 184 482 236Z" fill="${c.W}" opacity="0.5"/>`;
  for (const [x1, x2, y] of [[500, 530, 200], [540, 572, 180], [584, 616, 174], [628, 660, 178], [672, 704, 194]]) s += line(`M${x1} ${y + 6} Q${(x1 + x2) / 2} ${y - 6} ${x2} ${y + 2}`, c.W, 3.5, 0.85);
  s += HAIR_STRANDS.map((d) => line(d, c.W, 2, 0.5)).join("");
  s += `<path d="M720 160 C750 220 752 300 744 340 L760 340 L760 150Z" fill="${c.D}" opacity="0.4"/>`;
  s += `</g>`;
  s += glow(HAIR_FRONT, c, 3.5);
  // 아호게(삐친 머리) + 데이터 가닥
  s += glow("M604 102 C620 70 652 62 668 76 C650 72 630 82 616 104", c, 3);
  s += `<path d="M604 102 C620 70 652 62 668 76 C650 72 630 82 616 104Z" fill="${c.F}" opacity="0.6"/>`;
  s += dataTips(c);
  // 머리 장식(육각 핀)
  s += `<path d="${hexD(690, 186, 16)}" fill="${c.W}" opacity="0.8"/>` + glow(hexD(690, 186, 22), c, 2);
  s += `<path d="${hexD(714, 214, 9)}" fill="${c.L}" opacity="0.8"/>`;
  // 스캔라인 + 글리치 조각
  s += `<g clip-path="url(#${P}bodyClip)"><rect x="300" y="60" width="760" height="2240" fill="url(#${P}scan)"/></g>`;
  s += `</g>`;
  // 글리치 수평 띠
  for (const [y, h, dx, op] of [[742, 10, 18, 0.45], [1312, 6, -22, 0.4], [1850, 8, 16, 0.35], [520, 5, -14, 0.4]]) {
    s += `<rect x="${430 + dx}" y="${y}" width="${340}" height="${h}" fill="${c.L}" opacity="${op * 0.5}"/>`;
    s += `<rect x="${720 + dx}" y="${y}" width="${30}" height="${h}" fill="${c.W}" opacity="${op}"/>`;
    s += `<rect x="${410 + dx}" y="${y + h + 3}" width="${18}" height="3" fill="${c.W}" opacity="${op}"/>`;
  }
  s += ribbons(c, false);
  s += palmHolo(c);
  // 오른쪽 림 라이트(하늘색)
  s += line("M748 506 C760 546 746 590 722 612 M728 1030 C736 1250 718 1420 700 1580", "#8fe8ff", 2.5, 0.6);
  s += line("M710 248 C712 322 686 372 642 402", "#8fe8ff", 2.5, 0.55);
  s += emitter(c);
  s += `</svg>`;
  return s;
}
