// 강 교관 (50대 소령, 베테랑 교관) — 전신 입간판 SVG. 몸은 공통, 얼굴만 표정별로 바뀐다
export const ID = "kang", NAME = "강 교관";

const OL = "#1a1626", RIM = "#8fe8ff", ACC = "#ffb02e";
const C = {
  skin: "#dba682", skinS: "#b37460", skinD: "#8e5446", skinH: "#f0c7a4",
  hair: "#a4a6ad", hairS: "#6a6c77", hairH: "#dcdee3",
  jk: "#5f6b3c", jkS: "#414a28", jkD: "#2c331b", jkH: "#86925a",
  tr: "#525c33", trS: "#383f22", trH: "#748050",
  shirt: "#d4c79a", shirtS: "#a6986a", tie: "#2f3a22", tieS: "#1e2616",
  gold: "#ffb02e", goldS: "#b8700e", goldH: "#ffe7a6",
  shoe: "#1b1a20", shoeH: "#5a5868", leather: "#3a2b20",
};
// ── 도형 도우미 ──────────────────────────────────────────
const f = (n) => Math.round(n * 10) / 10;
// 점 목록 → 부드러운 닫힌 경로 (세 번째 값이 1이면 뾰족한 모서리)
function sm(pts, closed = true, t = 1) {
  const n = pts.length, P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = t / 6;
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? " Z" : "");
}
const ln = (pts, t) => sm(pts, false, t);
// 중심선 [x,y,굵기] → 팔다리 외곽
function tube(pts) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)], p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = p[2] / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]); R.push([p[0] - nx * w, p[1] - ny * w]);
  }
  const dir = (i, j) => { const dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const e = dir(n - 2, n - 1), s = dir(1, 0), we = pts[n - 1][2] * 0.5, ws = pts[0][2] * 0.5;
  const pts2 = [...L, [pts[n - 1][0] + e[0] * we * 0.8, pts[n - 1][1] + e[1] * we * 0.8], ...R.reverse(), [pts[0][0] + s[0] * ws * 0.5, pts[0][1] + s[1] * ws * 0.5]];
  return sm(pts2);
}
const shift = (d, dx, dy) => { let i = 0; return d.replace(/-?\d+(\.\d+)?/g, (m) => f(+m + (i++ % 2 ? dy : dx))); };

let defs = [], uid = 0;
const clip = (d) => { const id = `kang-c${uid++}`; defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return id; };
const P = (d, fill, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const S = (d, w = 3, col = OL, extra = "") => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
// 부품: 기본색 → (클립된) 음영 → 림라이트 → 외곽선
function part(d, fill, shades = "", o = {}) {
  const id = `kang-p${uid++}`;
  defs.push(`<path id="${id}" d="${d}"/>`);
  const u = (a) => `<use href="#${id}"${a}/>`;
  let s = u(` fill="${fill}"`);
  if (shades) {
    const cid = `kang-c${uid++}`;
    defs.push(`<clipPath id="${cid}">${u("")}</clipPath>`);
    s += `<g clip-path="url(#${cid})">${shades}</g>`;
  }
  if (o.rim !== false) {
    const mid = `kang-m${uid++}`, dx = o.rimW || 9;
    defs.push(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="2400">${u(` fill="#fff"`)}${u(` fill="#000" transform="translate(${-dx} ${o.rimY || 2})"`)}</mask>`);
    s += u(` fill="${o.rimC || RIM}" opacity="${o.rimO || 0.85}" mask="url(#${mid})"`);
  }
  if (o.sw !== 0) s += u(` fill="none" stroke="${OL}" stroke-width="${o.sw || 5}" stroke-linejoin="round"`);
  return s;
}
const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="kang-${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`).join("")}</linearGradient>`;
const G = (id) => `url(#kang-${id})`;
// 결정적 난수
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// 휴마 연합 휘장: 마름모 안의 날개
function insignia(x, y, s, rot = 0, col = ACC, bg = "#2a2a1c") {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    P("M0 -30 L26 0 L0 30 L-26 0 Z", bg, ` stroke="${col}" stroke-width="3.5" stroke-linejoin="round"`) +
    P("M0 -6 C-6 -14 -16 -14 -22 -10 C-16 -8 -12 -4 -10 0 C-14 2 -16 4 -18 8 C-10 8 -4 6 0 4 C4 6 10 8 18 8 C16 4 14 2 10 0 C12 -4 16 -8 22 -10 C16 -14 6 -14 0 -6 Z", col) +
    `<circle cx="0" cy="-2" r="3" fill="#fff3d8"/></g>`;
}
const btn = (x, y, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="none" stroke="${C.goldS}" stroke-width="1.4"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.25}" fill="#fff"/>`;
// 무궁화 모양 계급장 (소령: 1개)
function flower(x, y, s) {
  let p = "";
  for (let i = 0; i < 5; i++) p += `<ellipse cx="0" cy="-9" rx="6.5" ry="9" transform="rotate(${i * 72})" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="1.6"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${p}<circle r="5" fill="${C.goldS}" stroke="${OL}" stroke-width="1.4"/><circle r="2" fill="${C.goldH}"/></g>`;
}

// ── 몸 ─────────────────────────────────────────────────
function body() {
  let s = "";
  // 바지
  const legs = sm([[404, 1290], [396, 1500], [408, 1700], [422, 1900], [436, 2100], [446, 2318, 1], [574, 2318, 1], [570, 2100], [574, 1900], [584, 1700], [596, 1500], [600, 1400, 1], [606, 1500], [618, 1700], [628, 1900], [632, 2100], [628, 2318, 1], [756, 2318, 1], [768, 2100], [780, 1900], [792, 1700], [804, 1500], [796, 1290]]);
  s += part(legs, G("trV"),
    P(sm([[540, 1360], [598, 1420], [588, 1700], [576, 2320], [530, 2320], [550, 1900], [560, 1700]]), C.trS) +
    P(sm([[730, 1300], [800, 1290], [812, 1600], [790, 2320], [726, 2320], [750, 1900], [752, 1600]]), C.trS) +
    P(sm([[410, 1340], [436, 1340], [440, 1700], [446, 2000], [430, 2000], [414, 1700]]), C.trH, ` opacity=".55"`) +
    P(sm([[620, 1460], [640, 1460], [652, 1800], [660, 2100], [646, 2100], [632, 1800]]), C.trH, ` opacity=".45"`) +
    // 다림질 주름선
    S("M498 1360 C496 1700 500 2000 506 2300", 2.5, C.trS) + S("M500 1360 C498 1700 502 2000 508 2300", 1.2, C.trH) +
    S("M702 1360 C704 1700 704 2000 698 2300", 2.5, C.trS) + S("M704 1360 C706 1700 706 2000 700 2300", 1.2, C.trH) +
    // 무릎·발목 주름
    S("M420 1780 C450 1800 480 1800 500 1790", 2, C.trS) + S("M560 1800 C570 1810 580 1816 588 1816", 2, C.trS) +
    S("M712 1790 C740 1804 770 1804 796 1790", 2, C.trS) +
    S("M438 2250 C470 2268 520 2276 572 2262", 2.5, C.trS) + S("M448 2290 C490 2300 540 2302 574 2292", 2, C.trS) +
    S("M630 2262 C680 2276 730 2270 768 2250", 2.5, C.trS) + S("M630 2292 C670 2302 720 2300 760 2290", 2, C.trS) +
    // 바지 옆선 (금색 줄)
    S("M402 1310 C394 1600 404 1900 430 2310", 5, C.goldS) + S("M798 1310 C808 1600 794 1900 772 2310", 5, C.goldS)
  );
  // 구두
  const shoe = (pts, hx) => part(sm(pts), G("shoe"),
    P(sm([[hx - 60, 2312], [hx - 20, 2316], [hx - 30, 2336], [hx - 70, 2340]]), "#fff", ` opacity=".55"`) +
    `<rect x="0" y="2378" width="1200" height="20" fill="#0c0b10"/>` + S("M0 2378 L1200 2378", 2.5, OL) +
    S(`M${hx - 50} 2306 C${hx - 20} 2300 ${hx + 20} 2300 ${hx + 50} 2308`, 2, "#3a3848"), { sw: 4.5 });
  s += shoe([[428, 2296, 1], [580, 2296, 1], [584, 2340], [590, 2370], [588, 2394, 1], [392, 2394, 1], [388, 2370], [404, 2346], [424, 2326]], 500);
  s += shoe([[620, 2296, 1], [772, 2296, 1], [776, 2326], [796, 2346], [812, 2370], [808, 2394, 1], [612, 2394, 1], [610, 2370], [616, 2340]], 700);
  // 바지 밑단 (구두 위)
  s += S("M432 2300 C480 2316 540 2318 578 2304", 4, OL) + S("M624 2304 C660 2318 720 2316 768 2300", 4, OL);

  // 셔츠·넥타이 (V 안쪽)
  const neck = sm([[540, 392], [660, 392], [666, 488], [534, 488]]);
  s += part(neck, C.skin, P(sm([[530, 400], [672, 400], [672, 470], [600, 490], [528, 460]]), C.skinS) + P("M636 392 L680 392 L680 500 L646 500 Z", C.skinD, ` opacity=".35"`), { sw: 4.5, rim: false });
  s += S("M572 440 C580 460 590 470 600 474", 2, C.skinD) + S("M628 440 C620 460 610 470 600 474", 2, C.skinD);
  const shirtV = sm([[530, 470, 1], [670, 470, 1], [600, 790, 1]]);
  s += part(shirtV, C.shirt, P("M600 470 L700 470 L600 800 Z", C.shirtS, ` opacity=".6"`), { sw: 4, rim: false });
  // 넥타이
  s += part(sm([[582, 540, 1], [618, 540, 1], [636, 720], [600, 790, 1], [564, 720]]), G("tie"), P("M600 530 L650 530 L650 800 L600 800 Z", C.tieS) + [580, 620, 660, 700].map((y) => S(`M560 ${y + 20} L640 ${y - 20}`, 6, "#4a5a34", ` opacity=".7"`)).join(""), { sw: 3.5, rim: false });
  s += part(sm([[576, 506, 1], [624, 506, 1], [618, 546, 1], [582, 546, 1]]), C.tie, P("M600 500 L630 500 L630 550 L600 550 Z", C.tieS), { sw: 3.5, rim: false });
  s += `<rect x="584" y="604" width="32" height="8" rx="2" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="1.8"/>`;
  // 셔츠 깃
  s += part(sm([[534, 462, 1], [586, 510, 1], [566, 556, 1], [520, 490]]), C.shirt, P("M560 500 L590 500 L570 560 L540 560 Z", C.shirtS, ` opacity=".6"`), { sw: 3.5, rim: false });
  s += part(sm([[666, 462, 1], [614, 510, 1], [634, 556, 1], [680, 490]]), C.shirt, P("M640 470 L700 470 L700 560 L640 560 Z", C.shirtS), { sw: 3.5, rim: false });

  // 상의 (재킷)
  const jacket = sm([[536, 468], [470, 484], [404, 504], [374, 540], [368, 640], [374, 760], [386, 880], [402, 1000], [406, 1080], [400, 1180], [394, 1280], [388, 1348, 1], [596, 1356, 1], [600, 1290, 1], [604, 1356, 1], [812, 1348, 1], [806, 1280], [800, 1180], [794, 1080], [798, 1000], [814, 880], [826, 760], [832, 640], [826, 540], [796, 504], [730, 484], [664, 468], [600, 790, 1]]);
  s += part(jacket, G("jkV"),
    P(sm([[680, 470], [834, 520], [840, 1360], [700, 1360], [740, 1100], [770, 860], [740, 640]]), C.jkS) +
    P(sm([[400, 1100], [600, 1140], [800, 1100], [812, 1360], [388, 1360]]), C.jkS, ` opacity=".45"`) +
    P(sm([[384, 560], [420, 530], [430, 700], [410, 900], [394, 880], [386, 700]]), C.jkH, ` opacity=".5"`) +
    S("M600 790 L600 1290", 3, OL) + S("M606 800 L606 1290", 2, C.jkD) +
    S("M420 1010 C480 1030 540 1040 590 1040", 2, C.jkD) + S("M610 1040 C660 1040 720 1030 780 1010", 2, C.jkD) +
    S("M430 1300 C480 1310 540 1320 590 1300", 2, C.jkD) + S("M400 1180 L410 1300", 2, C.jkD)
  );
  // 옷깃 (노치 라펠)
  const lapL = sm([[536, 466], [600, 790, 1], [528, 668], [480, 572, 1], [508, 562, 1], [494, 530, 1], [512, 490]]);
  const lapR = sm([[664, 466], [600, 790, 1], [672, 668], [720, 572, 1], [692, 562, 1], [706, 530, 1], [688, 490]]);
  s += part(lapL, C.jk, P(sm([[540, 470], [600, 790, 1], [560, 700], [520, 600]]), C.jkH, ` opacity=".5"`) + S(ln([[490, 574], [532, 664], [596, 780]]), 2, C.jkD, ` stroke-dasharray="5 4"`), { sw: 4, rim: false });
  s += part(lapR, C.jkS, S(ln([[710, 574], [668, 664], [604, 780]]), 2, C.jkD, ` stroke-dasharray="5 4"`), { sw: 4, rim: false });
  // 칼라 휘장 (금색)
  s += insignia(512, 612, 0.42, -30, ACC, C.jk) + insignia(688, 612, 0.42, 30, ACC, C.jkS);
  // 가슴 주머니
  const cpocket = (x, dark) => {
    let p = part(sm([[x, 690, 1], [x + 104, 690, 1], [x + 106, 800, 1], [x + 52, 808], [x - 2, 800, 1]]), dark ? C.jkS : C.jk, P(`M${x + 60} 680 L${x + 120} 680 L${x + 120} 820 L${x + 60} 820 Z`, C.jkD, ` opacity="${dark ? 0.3 : 0.25}"`) + S(`M${x + 52} 700 L${x + 52} 800`, 2, C.jkD), { sw: 3, rim: false });
    p += part(sm([[x - 6, 676, 1], [x + 110, 676, 1], [x + 110, 712, 1], [x + 52, 728], [x - 6, 712, 1]]), dark ? C.jkS : C.jkH, P(`M${x + 60} 670 L${x + 120} 670 L${x + 120} 730 L${x + 60} 730 Z`, dark ? C.jkD : C.jk, ` opacity=".6"`), { sw: 3, rim: false });
    return p + btn(x + 52, 710, 7);
  };
  s += cpocket(440, false) + cpocket(656, true);
  // 명찰 (화면 왼쪽)
  s += `<rect x="452" y="640" width="80" height="22" rx="3" fill="#1e2216" stroke="${OL}" stroke-width="2.5"/>` + S("M462 651 L520 651", 3, C.goldH) + S("M462 651 L490 651", 3, ACC);
  // 약장 (화면 오른쪽, 3×3)
  const rib = [["#c8102e", "#fff", "#1e3a8a"], ["#ffb02e", "#2f6b3a", "#ffb02e"], ["#1e3a8a", "#ffb02e", "#1e3a8a"], ["#2f6b3a", "#fff", "#c8102e"], ["#7a1f5c", "#ffb02e", "#7a1f5c"], ["#fff", "#c8102e", "#fff"], ["#ffb02e", "#1e3a8a", "#fff"], ["#2f6b3a", "#c8102e", "#2f6b3a"], ["#1e3a8a", "#fff", "#1e3a8a"]];
  rib.forEach((c, i) => {
    const x = 660 + (i % 3) * 33, y = 582 + Math.floor(i / 3) * 15;
    s += `<rect x="${x}" y="${y}" width="32" height="14" fill="${c[0]}"/><rect x="${x + 10}" y="${y}" width="12" height="14" fill="${c[1]}"/><rect x="${x + 14}" y="${y}" width="4" height="14" fill="${c[2]}"/>` +
      `<rect x="${x}" y="${y}" width="32" height="5" fill="#fff" opacity=".25"/><rect x="${x}" y="${y}" width="32" height="14" fill="none" stroke="${OL}" stroke-width="1.6"/>`;
  });
  // 훈장 2개 (주머니 덮개에 매달림)
  const medal = (x, rc, star) => {
    let m = P(`M${x - 12} 724 L${x + 12} 724 L${x + 10} 760 L${x} 768 L${x - 10} 760 Z`, rc, ` stroke="${OL}" stroke-width="2"`) + `<rect x="${x - 4}" y="724" width="8" height="40" fill="#fff" opacity=".6"/>`;
    if (star) {
      let pts = "";
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 21, a = (i * 36 - 90) * Math.PI / 180; pts += `${f(x + Math.cos(a) * r)},${f(784 + Math.sin(a) * r)} `; }
      m += `<polygon points="${pts}" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x}" cy="784" r="6" fill="#c8102e" stroke="${OL}" stroke-width="1.5"/>`;
    } else m += `<circle cx="${x}" cy="786" r="17" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="2.2"/><circle cx="${x}" cy="786" r="11" fill="none" stroke="${C.goldS}" stroke-width="2"/>` + flower(x, 786, 0.45);
    return m;
  };
  s += medal(684, "#1e3a8a", true) + medal(734, "#c8102e", false);
  // 허리 띠 (가죽 혁대)
  s += part(sm([[402, 1066, 1], [600, 1078], [798, 1066, 1], [798, 1108, 1], [600, 1120], [402, 1108, 1]]), C.leather, P("M620 1060 L810 1060 L810 1130 L620 1130 Z", "#24190f") + S("M410 1074 C500 1084 700 1084 790 1074", 1.5, "#7a5a3e") + S("M410 1100 C500 1110 700 1110 790 1100", 1.5, "#7a5a3e"), { sw: 4 });
  s += `<rect x="572" y="1062" width="56" height="62" rx="6" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="3"/><rect x="584" y="1074" width="32" height="38" rx="3" fill="none" stroke="${C.goldS}" stroke-width="3"/>` + insignia(600, 1093, 0.5, 0, C.goldS, ACC);
  // 아래 주머니
  for (const x of [420, 664]) {
    const dark = x > 600;
    s += part(sm([[x, 1170, 1], [x + 116, 1170, 1], [x + 116, 1214, 1], [x + 58, 1226], [x, 1214, 1]]), dark ? C.jkS : C.jk, P(`M${x + 70} 1160 L${x + 130} 1160 L${x + 130} 1230 L${x + 70} 1230 Z`, C.jkD, ` opacity=".4"`), { sw: 3, rim: false });
    s += btn(x + 58, 1206, 7) + S(`M${x + 4} 1290 L${x + 112} 1290`, 2, C.jkD, ` stroke-dasharray="5 4"`);
  }
  // 단추
  s += btn(600, 820, 10) + btn(600, 1150, 10) + btn(600, 1250, 10);
  return s;
}

function shoulders() {
  let s = "";
  // 견장 (어깨판)
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1200 - x);
    const d = sm([[X(398), 520, 1], [X(518), 484, 1], [X(530), 506, 1], [X(530), 520, 1], [X(408), 554, 1]]);
    s += part(d, side < 0 ? C.jk : C.jkS, S(`M${X(404)} 526 L${X(520)} 492`, 3, ACC), { sw: 3.5, rim: side > 0 });
    s += S(`M${X(404)} 548 L${X(526)} 514`, 3, ACC) + flower(X(452), 522, 0.62) + btn(X(516), 500, 6);
  }
  // 금색 장식끈 (화면 왼쪽 어깨에서 가슴으로)
  const cord = "M432 540 C440 600 470 650 500 668 C506 630 504 590 498 556";
  s += S(cord, 8, OL) + S(cord, 5, ACC) + S(cord, 5, C.goldS, ` stroke-dasharray="3 5"`) + S(cord, 1.4, C.goldH);
  s += `<path d="M494 666 L508 666 L512 694 L490 694 Z" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="2"/>`;
  return s;
}
// ── 팔짱 ────────────────────────────────────────────────
function arms() {
  let up = "", s = "";
  const sleeve = (pts, shade) => part(tube(pts), G("jkV"), shade, {});
  // 위팔 (양쪽)
  up += sleeve([[442, 552, 124], [424, 740, 116], [412, 910, 108]],
    P(sm([[456, 600], [480, 620], [470, 900], [446, 940], [456, 760]]), C.jkS, ` opacity=".7"`) + P(sm([[384, 600], [404, 590], [380, 820], [362, 860]]), C.jkH, ` opacity=".6"`) +
    S("M372 800 C392 820 410 826 436 820", 2.5, C.jkD) + S("M364 850 C388 870 412 874 440 868", 2.5, C.jkD));
  up += sleeve([[758, 552, 124], [776, 740, 116], [788, 910, 108]],
    P(sm([[800, 520], [900, 600], [900, 980], [820, 980], [840, 760]]), C.jkS) +
    S("M760 800 C780 820 800 826 828 820", 2.5, C.jkD) + S("M760 850 C786 870 810 874 840 868", 2.5, C.jkD));
  // 뒤쪽 팔뚝 (화면 오른쪽 팔 → 왼쪽으로, 앞팔 뒤에 숨음)
  s += sleeve([[800, 900, 108], [700, 866, 102], [520, 850, 96]],
    P(sm([[500, 870], [860, 890], [860, 990], [500, 910]]), C.jkS) + S("M760 860 C770 880 772 900 768 916", 2.5, C.jkD));
  s += S("M534 806 C538 836 538 870 534 896", 9, OL) + S("M534 806 C538 836 538 870 534 896", 5, ACC); // 소매 금줄
  // 뒤쪽 손: 왼쪽 위팔을 감싼 손가락 끝만 보임
  s += hand(-1);
  // 앞쪽 팔뚝 (화면 왼쪽 팔 → 오른쪽으로)
  s += sleeve([[400, 920, 112], [520, 950, 106], [680, 924, 98]],
    P(sm([[380, 960], [700, 940], [710, 990], [390, 1000]]), C.jkS) + P(sm([[400, 890], [540, 904], [540, 916], [400, 906]]), C.jkH, ` opacity=".6"`) +
    S("M460 904 C470 924 470 944 464 974", 2.5, C.jkD) + S("M600 916 C610 936 612 952 606 972", 2.5, C.jkD));
  s += S("M676 874 C682 906 684 936 680 972", 10, OL) + S("M676 874 C682 906 684 936 680 972", 6, ACC);
  s += hand(1);
  return { up, s };
}
// 손: side 1 = 앞손(화면 오른쪽 위팔을 잡음, 손등·손가락이 보임), -1 = 뒤손(손가락 끝만)
function hand(side) {
  let s = "";
  if (side > 0) {
    // 손등
    s += part(sm([[680, 884], [740, 868], [776, 878], [788, 934], [766, 972], [700, 980], [680, 950]]), G("skinV"),
      P(sm([[740, 864], [800, 884], [800, 990], [740, 990]]), C.skinS) + S("M700 906 C722 902 742 902 766 908", 1.6, C.skinD) + S("M702 934 C726 932 748 934 770 940", 1.4, C.skinD), { sw: 4 });
    // 엄지 (위팔 앞면을 따라 위로)
    s += part(sm([[704, 884], [722, 862], [744, 850], [762, 852], [762, 866], [748, 880], [738, 892]]), C.skin, P(sm([[756, 846], [776, 860], [750, 890], [740, 880]]), C.skinS) + `<path d="M748 856 C754 852 762 852 762 860 C756 864 750 864 748 856 Z" fill="${C.skinH}" stroke="${C.skinD}" stroke-width="1.2"/>`, { sw: 3.5, rim: false });
    // 손가락 4개 (위팔 바깥쪽을 감쌈)
    [[880, 25], [905, 25], [930, 24], [953, 21]].forEach(([y, h], i) => {
      const x0 = 774, x1 = 838 - i * 4;
      const d = sm([[x0, y - h / 2], [x1 - 14, y - h / 2 - 2], [x1 + 4, y - h / 2 + 4], [x1 + 8, y + 2], [x1 - 4, y + h / 2], [x0, y + h / 2]]);
      s += part(d, C.skin, P(`M${x0} ${y + 2} L${x1 + 12} ${y + 2} L${x1 + 12} ${y + h} L${x0} ${y + h} Z`, C.skinS) + S(`M${x1 - 20} ${y - h / 2 + 3} C${x1 - 22} ${y} ${x1 - 22} ${y + 4} ${x1 - 20} ${y + h / 2 - 3}`, 1.4, C.skinD) +
        `<path d="M${x1 - 8} ${y - h / 2 + 5} C${x1} ${y - h / 2 + 4} ${x1 + 4} ${y} ${x1 + 2} ${y + 4} C${x1 - 4} ${y + 2} ${x1 - 8} ${y} ${x1 - 8} ${y - h / 2 + 5} Z" fill="${C.skinH}" opacity=".8"/>`, { sw: 3.5, rimW: 5 });
    });
    s += S("M780 870 C786 896 786 944 778 976", 2, C.skinD);
  } else {
    // 뒤손: 화면 왼쪽 위팔 바깥쪽에 손가락 끝 4개
    [[826, 23], [849, 23], [872, 22], [893, 19]].forEach(([y, h], i) => {
      const x0 = 380, x1 = 346 + i * 3;
      const d = sm([[x0, y - h / 2], [x1 + 10, y - h / 2 - 1], [x1 - 4, y], [x1 + 10, y + h / 2], [x0, y + h / 2]]);
      s += part(d, C.skin, P(`M${x0 + 4} ${y + 2} L${x1 - 10} ${y + 2} L${x1 - 10} ${y + h} L${x0 + 4} ${y + h} Z`, C.skinS) + `<path d="M${x1 + 2} ${y - 6} C${x1 + 8} ${y - 8} ${x1 + 10} ${y - 2} ${x1 + 8} ${y + 2} C${x1 + 4} ${y + 2} ${x1} ${y} ${x1 + 2} ${y - 6} Z" fill="${C.skinH}"/>`, { sw: 3.5, rim: false });
    });
  }
  return s;
}

// ── 머리 ────────────────────────────────────────────────
const FACE = sm([[500, 236], [496, 320], [504, 386], [520, 414, 1], [560, 438], [600, 444], [640, 438], [680, 414, 1], [696, 386], [704, 320], [700, 236], [600, 220]]);
function head(expr) {
  let s = "";
  // 뒷머리 (회색 짧은 머리, 모자 아래)
  const back = sm([[484, 210], [716, 210], [720, 300], [710, 336], [490, 336], [480, 300]]);
  s += part(back, G("hairV"), P(sm([[650, 220], [730, 230], [730, 340], [680, 340]]), C.hairS), { sw: 4.5 });
  // 귀
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1200 - x);
    const ear = sm([[X(502), 290], [X(480), 282], [X(468), 306], [X(472), 336], [X(486), 358], [X(504), 356]]);
    s += part(ear, C.skin, P(sm([[X(480), 296], [X(492), 302], [X(488), 336], [X(480), 344]]), C.skinS) + (side > 0 ? P(sm([[X(480), 276], [X(460), 306], [X(480), 366], [X(490), 326]]), C.skinS) : ""), { sw: 4.5, rim: side > 0 });
    s += S(ln([[X(494), 298], [X(480), 302], [X(478), 324], [X(490), 340]]), 2.2, C.skinD);
  }
  // 얼굴
  s += part(FACE, G("skinV"),
    P(sm([[660, 230], [704, 236], [710, 330], [696, 396], [670, 430], [600, 452], [646, 410], [670, 360], [676, 290]]), C.skinS) +
    // 모자 챙 그림자
    P(sm([[480, 200], [720, 200], [716, 262], [660, 274], [600, 278], [540, 274], [484, 262]]), C.skinS) +
    P(sm([[480, 200], [720, 200], [716, 236], [600, 248], [484, 236]]), C.skinD, ` opacity=".45"`) +
    S("M560 232 C580 228 620 228 640 232", 1.6, C.skinD)  +
    // 턱·광대
    P(sm([[530, 412], [600, 432], [670, 412], [640, 452], [560, 452]]), C.skinS) +
    P(sm([[540, 420], [600, 434], [660, 420], [654, 432], [600, 446], [546, 432]]), "#6a5a64", ` opacity=".14"`) +
    P(sm([[510, 330], [528, 324], [524, 360], [510, 356]]), C.skinH, ` opacity=".8"`) +
    // 볼 패임
    P(sm([[530, 360], [546, 372], [544, 404], [532, 396]]), C.skinS, ` opacity=".5"`) +
    S("M566 424 C584 430 616 430 634 424", 2, C.skinD) + S("M596 432 C598 438 602 438 604 432", 1.8, C.skinD),
    { sw: 5 });
  // 구레나룻 (짧은 회색)
  for (const side of [-1, 1]) {
    const X = (x) => (side < 0 ? x : 1200 - x);
    s += part(sm([[X(498), 236, 1], [X(516), 236, 1], [X(512), 268], [X(504), 300, 1], [X(498), 270]]), side > 0 ? C.hairS : C.hair, "", { sw: 3, rim: false });
    for (let i = 0; i < 4; i++) s += S(`M${X(502 + i * 3)} ${244 + i * 12} L${X(506 + i * 3)} ${252 + i * 12}`, 1.4, C.hairS);
  }
  // 코 (큼직)
  s += S(ln([[606, 300], [612, 340], [622, 360], [614, 370]]), 2.6, C.skinD) +
    P("M586 362 C592 372 608 376 622 368 C616 380 596 380 586 372 Z", C.skinS) +
    S("M584 360 C578 366 580 374 588 374", 2.2, C.skinD) + S("M622 358 C630 364 628 372 620 374", 2.2, C.skinD) + `<circle cx="600" cy="352" r="3.5" fill="${C.skinH}"/>`;
  // 팔자 주름
  s += S("M578 372 C562 386 556 404 560 420", 2.2, C.skinD) + S("M626 372 C642 386 648 404 644 420", 2.2, C.skinD);
  s += face(expr);
  s += cap();
  return s;
}
function cap() {
  let s = `<g transform="translate(0 -26)">`;
  // 크라운 (윗면)
  const crown = sm([[452, 176], [462, 128], [520, 96], [600, 84], [680, 96], [738, 128], [748, 176], [720, 200], [600, 208], [480, 200]]);
  s += part(crown, G("capV"),
    P(sm([[650, 86], [740, 126], [752, 180], [700, 204], [690, 140]]), C.jkS) +
    P(sm([[470, 150], [520, 108], [580, 96], [540, 120], [490, 160]]), C.jkH, ` opacity=".7"`) +
    S("M470 180 C520 196 680 196 730 180", 2.5, C.jkD) + S("M600 90 L600 196", 2, C.jkD, ` opacity=".6"`), { sw: 5 });
  // 띠 (검은 밴드)
  const band = sm([[484, 190, 1], [600, 200], [716, 190, 1], [712, 246, 1], [600, 254], [488, 246, 1]]);
  s += part(band, "#24281a", P("M640 180 L730 180 L730 260 L640 260 Z", "#15180f") + S("M490 204 C560 212 640 212 710 204", 1.5, "#4a5034"), { sw: 4.5 });
  // 금색 턱끈
  s += S("M494 230 C560 240 640 240 706 230", 10, OL) + S("M494 230 C560 240 640 240 706 230", 6, ACC) + S("M494 228 C560 238 640 238 706 228", 1.5, C.goldH) + btn(494, 232, 8) + btn(706, 232, 8);
  // 챙 (광택 검정)
  const visor = sm([[480, 240, 1], [600, 256], [720, 240, 1], [714, 262], [660, 284], [600, 290], [540, 284], [486, 262]]);
  s += part(visor, G("visor"), P(sm([[500, 252], [600, 264], [690, 254], [640, 268], [560, 270]]), "#8a8aa0", ` opacity=".7"`), { sw: 4.5 });
  // 챙 금색 잎 장식
  for (let i = 0; i < 12; i++) {
    const t = i / 11, x = 500 + t * 200, y = 252 + Math.sin(t * Math.PI) * 12;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="7" ry="3.2" transform="rotate(${f((t - 0.5) * 30 + (i % 2 ? 24 : -24))} ${f(x)} ${f(y)})" fill="${ACC}" stroke="${C.goldS}" stroke-width="1"/>`;
  }
  // 모표: 월계수 + 휘장
  let leaves = "";
  for (let i = 0; i < 6; i++) {
    for (const sd of [-1, 1]) {
      const a = (200 + i * 22) * Math.PI / 180, x = 600 + sd * Math.cos(a) * -40, y = 168 + Math.sin(a) * -34;
      leaves += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="4.5" transform="rotate(${f(sd * (60 - i * 24))} ${f(x)} ${f(y)})" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="1.4"/>`;
    }
  }
  s += leaves + insignia(600, 150, 1.05, 0, ACC, "#3a2a14") + `<path d="M560 116 L600 100 L640 116 L600 124 Z" fill="url(#kang-goldR)" stroke="${OL}" stroke-width="2"/>`;
  return s + `</g>`;
}
// ── 표정 ───────────────────────────────────────────────
function eye(cx, cy, side, o) {
  let s = `<g transform="translate(${cx} ${cy}) scale(${side} 1)">`;
  const up = o.up || [[-28, 4], [-18, -8], [8, -14], [28, -4]];
  const lo = o.lo || [[28, -4], [28, 5], [12, 11], [-4, 11], [-22, 9]];
  const white = `M${up[0][0]} ${up[0][1]} C${up[1][0]} ${up[1][1]} ${up[2][0]} ${up[2][1]} ${up[3][0]} ${up[3][1]} C${lo[1][0]} ${lo[1][1]} ${lo[2][0]} ${lo[2][1]} ${lo[3][0]} ${lo[3][1]} C${lo[4][0]} ${lo[4][1]} ${up[0][0] + 2} ${up[0][1] + 6} ${up[0][0]} ${up[0][1]} Z`;
  const id = `kang-e${uid++}`;
  defs.push(`<clipPath id="${id}"><path d="${white}"/></clipPath>`);
  const ir = o.ir || 1, ix = o.ix || 1, iy = o.iy || 1;
  s += P(white, "#f6efe6");
  s += `<g clip-path="url(#${id})">` +
    `<ellipse cx="${ix}" cy="${iy}" rx="${12 * ir}" ry="${14 * ir}" fill="url(#kang-iris)" stroke="#14161c" stroke-width="2"/>` +
    `<ellipse cx="${ix}" cy="${iy + 1}" rx="${5.5 * ir}" ry="${7.5 * ir}" fill="#0e1014"/>` +
    `<ellipse cx="${ix}" cy="${iy + 8 * ir}" rx="${8 * ir}" ry="${4 * ir}" fill="#9ab4c8" opacity=".5"/>` +
    P(`M-40 -30 L40 -30 L40 ${up[2][1] + 8} C10 ${up[2][1] - 1} -20 ${up[1][1] + 5} -40 0 Z`, "#1a1626", ` opacity=".35"`) +
    `<ellipse cx="${ix - 5 * ir}" cy="${iy - 5 * ir}" rx="${4 * ir}" ry="${4.5 * ir}" fill="#fff"/>` +
    `<circle cx="${ix + 5 * ir}" cy="${iy + 6 * ir}" r="${1.8 * ir}" fill="#fff"/>` +
    `<circle cx="${ix + 6 * ir}" cy="${iy - 5 * ir}" r="${1.1 * ir}" fill="#fff" opacity=".9"/>` +
    `</g>`;
  s += S(`M${up[0][0] - 2} ${up[0][1] + 1} C${up[1][0]} ${up[1][1]} ${up[2][0]} ${up[2][1]} ${up[3][0]} ${up[3][1]}`, 5.5) +
    P(`M${up[3][0] - 8} ${up[3][1] - 4} L${up[3][0] + 6} ${up[3][1] - 2} L${up[3][0]} ${up[3][1] + 5} Z`, OL);
  s += S(`M${lo[0][0]} ${lo[0][1] + 3} C${lo[1][0]} ${lo[1][1]} ${lo[2][0]} ${lo[2][1]} ${lo[3][0]} ${lo[3][1]}`, 2);
  // 처진 눈꺼풀 주름 + 눈밑 주름 + 눈가 주름
  s += S(`M${up[1][0]} ${up[1][1] - 7} C${up[1][0] + 14} ${up[2][1] - 9} ${up[2][0] + 8} ${up[2][1] - 6} ${up[3][0] + 2} ${up[3][1] - 6}`, 2.2, C.skinD);
  s += S(`M-14 ${lo[3][1] + 8} C-2 ${lo[3][1] + 12} 10 ${lo[3][1] + 11} 20 ${lo[3][1] + 5}`, 1.6, C.skinD);
  s += S("M34 -2 L42 -6 M34 4 L43 5", 1.6, C.skinD);
  return s + `</g>`;
}
function brow(cx, cy, side, yi, yo, arch = 0) {
  const mid = (yi + yo) / 2 - 5 - arch;
  const d = sm([[-36, yi - 9, 1], [-4, mid - 10], [30, yo - 6], [46, yo + 3, 1], [24, yo + 5], [-4, mid + 6], [-34, yi + 10, 1]]);
  let s = `<g transform="translate(${cx} ${cy}) scale(${side} 1)">` + P(d, C.hair, ` stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"`);
  s += P(sm([[-30, yi + 2], [0, mid + 2], [36, yo + 2], [0, mid + 6]]), C.hairS);
  for (let i = 0; i < 6; i++) { const x = -28 + i * 12, y = yi + (yo - yi) * (i / 6) - 4; s += S(`M${x} ${f(y + 6)} L${x + 9} ${f(y - 6)}`, 1.5, i % 2 ? "#ffffff" : C.hairS, ` opacity=".7"`); }
  return s + `</g>`;
}
function face(e) {
  const L = 552, R = 648, Y = 318;
  const cfg = {
    normal: { b: [-26, -32, 0], eye: {} },
    smile: { b: [-32, -36, 4], eye: { up: [[-28, 4], [-18, -9], [8, -14], [28, -4]], lo: [[28, -4], [26, 0], [12, 4], [-4, 4], [-22, 5]], iy: -1 } },
    angry: { b: [-14, -38, -4], eye: { up: [[-28, 4], [-18, -2], [8, -12], [28, -8]], ir: 0.85 } },
    sad: { b: [-40, -26, 2], eye: { up: [[-28, 3], [-18, -10], [8, -12], [28, 0]], lo: [[28, 0], [28, 6], [12, 11], [-4, 11], [-22, 9]], iy: 5 } },
    surprise: { b: [-44, -46, 6], eye: { up: [[-28, 4], [-20, -18], [8, -22], [29, -8]], lo: [[29, -8], [30, 8], [12, 16], [-4, 16], [-24, 12]], ir: 0.7 } },
    serious: { b: [-20, -32, -2], eye: { up: [[-28, 4], [-18, -4], [8, -9], [28, -3]], lo: [[28, -3], [28, 3], [12, 7], [-4, 7], [-22, 6]], ir: 0.95 } },
  }[e] || {};
  let s = eye(L, Y, -1, cfg.eye) + eye(R, Y, 1, cfg.eye);
  s += brow(L, Y, -1, cfg.b[0], cfg.b[1], cfg.b[2]) + brow(R, Y, 1, cfg.b[0], cfg.b[1], cfg.b[2]);
  // 왼쪽 눈썹(화면 오른쪽) 흉터
  s += S("M672 262 L660 300", 9, C.skin) + S("M676 246 L658 304", 5, "#eabcaa") + S("M676 246 L658 304", 1.4, C.skinD) + S("M666 262 L673 267 M662 278 L669 283 M659 292 L665 296", 1.3, C.skinD);
  // 미간 주름
  if (e !== "surprise" && e !== "smile") s += S("M590 292 C594 300 594 308 591 314", 2.2, C.skinD) + S("M610 292 C606 300 606 308 609 314", 2.2, C.skinD);
  if (e === "angry") s += S("M598 286 L598 304", 2, C.skinD);
  // 콧수염
  const mus = "M544 392 C552 370 580 364 600 372 C620 364 648 370 656 392 C650 400 640 398 632 394 C620 390 610 392 600 394 C590 392 580 390 568 394 C560 398 550 400 544 392 Z";
  const mid = clip(mus);
  // 입 (콧수염 아래)
  if (e === "normal") s += S("M570 404 C586 400 614 400 630 404", 3.5) + S("M570 404 L564 410 M630 404 L636 410", 2.5) + S("M584 418 C594 420 606 420 616 418", 2, C.skinD);
  else if (e === "smile") s += S("M566 400 C584 412 616 412 634 400", 3.5) + S("M566 400 L560 394 M634 400 L640 394", 2.5) + S("M586 422 C594 424 606 424 614 422", 2, C.skinD) + S("M532 340 C536 350 538 360 536 370", 1.8, C.skinD) + S("M668 340 C664 350 662 360 664 370", 1.8, C.skinD);
  else if (e === "angry") {
    const m = "M562 394 C584 392 616 392 638 394 C640 418 624 432 600 432 C576 432 560 418 562 394 Z";
    const id = clip(m);
    s += P(m, "#5a1a1a") + `<g clip-path="url(#${id})">` + P("M550 386 L650 386 L650 406 C620 410 580 410 550 406 Z", "#fff") + P("M570 432 L630 432 L630 420 C610 416 590 416 570 420 Z", "#f4eee6") + [580, 600, 620].map((x) => S(`M${x} 386 L${x} 406`, 1.4, "#a89aa8")).join("") + `</g>` + S(m, 4);
    s += `<g transform="translate(690 262)">` + S("M-12 -3 C-5 -3 -3 -5 -3 -12 M3 -12 C3 -5 5 -3 12 -3 M12 3 C5 3 3 5 3 12 M-3 12 C-3 5 -5 3 -12 3", 6.5, OL) + S("M-12 -3 C-5 -3 -3 -5 -3 -12 M3 -12 C3 -5 5 -3 12 -3 M12 3 C5 3 3 5 3 12 M-3 12 C-3 5 -5 3 -12 3", 3.5, "#ff4a3a") + `</g>`;
  } else if (e === "sad") s += S("M572 410 C586 402 614 402 628 410", 3.5) + S("M588 424 C596 422 604 422 612 424", 2, C.skinD);
  else if (e === "surprise") {
    const m = "M584 400 C586 394 614 394 616 400 C618 420 610 430 600 430 C590 430 582 420 584 400 Z";
    s += P(m, "#5a1a1a") + P("M590 420 C596 414 604 414 610 420 C606 428 594 428 590 420 Z", "#c85a50") + S(m, 3.5);
    s += P("M730 300 C736 316 740 326 734 334 C726 340 716 332 720 322 C722 316 726 308 730 300 Z", "#bfefff", ` stroke="#5fb8e0" stroke-width="2"`);
  } else if (e === "serious") s += S("M572 404 L628 404", 4) + S("M586 418 C594 420 606 420 614 418", 2, C.skinD);
  s += P(mus, G("hairV")) + `<g clip-path="url(#${mid})">` + P("M600 360 L670 360 L670 404 L600 404 Z", C.hairS) +
    [...Array(9)].map((_, i) => { const x = 552 + i * 12; return S(`M${x} 396 C${x + (x < 600 ? 4 : -4)} 384 ${x + (x < 600 ? 8 : -8)} 376 ${x + (x < 600 ? 12 : -12)} 372`, 1.4, i % 2 ? C.hairH : C.hairS); }).join("") + `</g>` + S(mus, 3.2);
  return s;
}

function gradients() {
  return lg("jkV", [[0, C.jkH], [0.3, C.jk], [1, "#4c5630"]]) +
    lg("capV", [[0, C.jkH], [0.6, C.jk], [1, C.jkS]]) +
    lg("trV", [[0, C.trH], [0.3, C.tr], [1, C.trS]]) +
    lg("tie", [[0, "#3e4c2c"], [1, C.tieS]]) +
    lg("shoe", [[0, C.shoeH], [0.35, C.shoe], [1, "#0c0b10"]]) +
    lg("visor", [[0, "#3a3a4a"], [0.5, "#121118"], [1, "#050508"]]) +
    lg("hairV", [[0, C.hairH], [0.5, C.hair], [1, C.hairS]]) +
    lg("skinV", [[0, "#e8b896"], [1, C.skin]]) +
    `<radialGradient id="kang-goldR" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${C.goldH}"/><stop offset="0.5" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldS}"/></radialGradient>` +
    `<radialGradient id="kang-iris" cx="0.5" cy="0.3" r="0.75"><stop offset="0" stop-color="#16181e"/><stop offset="0.6" stop-color="#4a5462"/><stop offset="1" stop-color="#9aa8b8"/></radialGradient>`;
}

export function svg(expr = "normal") {
  defs = []; uid = 0;
  const A = arms();
  const content = `<ellipse cx="600" cy="2392" rx="300" ry="14" fill="#000" opacity=".25"/>` + body() + head(expr) + A.up + shoulders() + A.s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400"><defs>${gradients()}${defs.join("")}</defs>${content}</svg>`;
}
