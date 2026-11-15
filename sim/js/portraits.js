// 스토리 인물 초상화: 외곽선 있는 셀 스타일 SVG. portrait(이름, 표정) → data URL
// 표정: normal smile angry sad surprise serious
import { ART } from "../img/story/chars/art.js";
const INK = "#1b1d2b";
const cache = new Map();

// 얼굴 공용 부품 ─────────────────────────────────────────
const FACE = "M138 196 C136 284 166 328 200 336 C234 328 264 284 262 196 C262 138 236 108 200 108 C164 108 138 138 138 196Z";
const FACE_WIDE = "M128 196 C126 292 160 334 200 340 C240 334 274 292 272 196 C272 134 242 104 200 104 C158 104 128 134 128 196Z";

function eyes(e, iris, o = {}) {
  const narrow = o.narrow ? 0.78 : 1, y = 230;
  const one = (side) => {
    const m = (side < 0 ? "" : ` transform="translate(400 0) scale(-1 1)"`), z = ` transform="translate(165 ${y}) scale(1.2) translate(-170 -${y})"`;
    let s = "";
    if (e === "smile") s = `<path d="M150 ${y + 2} Q170 ${y - 16} 190 ${y + 2}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round"/>`;
    else {
      const ry = (e === "surprise" ? 13 : e === "angry" ? 9 : 12) * narrow, rx = e === "surprise" ? 8 : 9.5;
      const top = e === "angry" ? y - 8 : e === "surprise" ? y - 16 : y - 13 * narrow;
      s += `<path d="M151 ${y + 4} Q152 ${top + 2} 170 ${top} Q186 ${top} 190 ${y + 2} Q182 ${y + 13} 170 ${y + 13} Q156 ${y + 12} 151 ${y + 4}Z" fill="#fbfbff"/>`;
      s += `<ellipse cx="171" cy="${y + 2}" rx="${rx}" ry="${ry}" fill="${iris}"/><ellipse cx="171" cy="${y + 4}" rx="${rx * 0.5}" ry="${ry * 0.55}" fill="${INK}" opacity="0.85"/>`;
      s += `<ellipse cx="171" cy="${y + 8}" rx="${rx * 0.7}" ry="${ry * 0.3}" fill="#fff" opacity="0.18"/>`;
      s += `<circle cx="175" cy="${y - 3}" r="${e === "sad" ? 4.2 : 3.2}" fill="#fff"/><circle cx="167" cy="${y + 7}" r="1.6" fill="#fff"/>`;
      s += `<path d="M150 ${y + 3} Q152 ${top - 2} 170 ${top - 3} Q185 ${top - 3} 191 ${y - 1}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (e === "sad") s += `<path d="M160 ${y + 18} q-2 8 1 12" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
    }
    // 눈썹
    const bw = o.thickBrow ? 7 : 4.5, bc = o.brow || INK;
    const B = { normal: [150, 200, 190, 198], smile: [150, 196, 190, 194], angry: [150, 196, 190, 210], sad: [152, 206, 190, 194], surprise: [150, 188, 190, 186], serious: [150, 203, 190, 205] }[e] || [150, 200, 190, 198];
    s += `<path transform="translate(0 -9)" d="M${B[0]} ${B[1]} Q170 ${Math.min(B[1], B[3]) - 5} ${B[2]} ${B[3]}" fill="none" stroke="${bc}" stroke-width="${bw}" stroke-linecap="round"/>`;
    return `<g${m}><g${z}>${s}</g></g>`;
  };
  return one(-1) + one(1);
}
function mouth(e, o = {}) {
  const y = o.my || 288;
  switch (e) {
    case "smile": return `<path d="M182 ${y - 4} Q200 ${y + 14} 218 ${y - 4} Q200 ${y + 4} 182 ${y - 4}Z" fill="#9a3a3a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    case "angry": return `<path d="M184 ${y + 2} Q200 ${y - 6} 216 ${y + 2} L214 ${y + 6} Q200 ${y + 1} 186 ${y + 6}Z" fill="#7a2a2a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M188 ${y + 1} L212 ${y + 1}" stroke="#fff" stroke-width="2"/>`;
    case "sad": return `<path d="M188 ${y + 4} Q200 ${y - 4} 212 ${y + 4}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    case "surprise": return `<ellipse cx="200" cy="${y + 2}" rx="8" ry="10" fill="#7a2a2a" stroke="${INK}" stroke-width="3"/>`;
    case "serious": return `<path d="M188 ${y} L212 ${y}" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    default: return `<path d="M188 ${y - 1} Q200 ${y + 6} 212 ${y - 1}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
}
function head(c, e) {
  const F = c.wide ? FACE_WIDE : FACE;
  let s = "";
  // 목·귀
  s += `<path d="M176 300 L176 392 L224 392 L224 300Z" fill="${c.skin}" stroke="${INK}" stroke-width="4"/><path d="M176 318 Q200 344 224 318 L224 340 Q200 356 176 340Z" fill="${c.shade}"/>`;
  const ex = c.wide ? 126 : 136;
  s += `<ellipse cx="${ex}" cy="232" rx="13" ry="20" fill="${c.skin}" stroke="${INK}" stroke-width="4"/><ellipse cx="${400 - ex}" cy="232" rx="13" ry="20" fill="${c.skin}" stroke="${INK}" stroke-width="4"/>`;
  s += `<path d="${F}" fill="${c.skin}" stroke="${INK}" stroke-width="4.5"/>`;
  // 앞머리 그림자
  s += `<path d="M146 170 Q200 196 254 170 L254 186 Q200 214 146 186Z" fill="${c.shade}" opacity="0.7"/>`;
  if (e === "smile" || c.blush) s += `<ellipse cx="160" cy="262" rx="14" ry="6" fill="#ff8a8a" opacity="${e === "smile" ? 0.45 : 0.25}"/><ellipse cx="240" cy="262" rx="14" ry="6" fill="#ff8a8a" opacity="${e === "smile" ? 0.45 : 0.25}"/>`;
  s += `<path d="M201 248 L196 264 L204 265" fill="none" stroke="${c.shade2 || "#c48f78"}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += eyes(e, c.iris, c);
  s += mouth(e, c);
  return s;
}
function body(c) {
  const w = c.bodyW || 1, L = 200 - 140 * w, R = 200 + 140 * w;
  let s = `<g transform="translate(200 560) scale(0.9) translate(-200 -560)"><path d="M${L} 560 C${L + 8} 470 ${200 - 80 * w} 420 176 392 L224 392 C${200 + 80 * w} 420 ${R - 8} 470 ${R} 560Z" fill="${c.suit}" stroke="${INK}" stroke-width="4.5"/>`;
  s += `<path d="M${L + 30} 560 C${L + 36} 500 ${200 - 70 * w} 460 ${200 - 40 * w} 440" fill="none" stroke="${c.suit2 || "rgba(0,0,0,0.25)"}" stroke-width="10" opacity="0.5"/>`;
  s += `<path d="M162 394 L200 446 L238 394 L228 384 L200 426 L172 384Z" fill="${c.accent}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s += `<circle cx="${200 - 70 * w}" cy="488" r="15" fill="${c.accent}" stroke="${INK}" stroke-width="3"/><path d="M${200 - 70 * w - 7} 488 l7 -8 l7 8 l-7 8Z" fill="#fff" opacity="0.85"/>`;
  s += `<path d="M${200 + 50 * w} 470 l${50 * w} 0" stroke="${c.accent}" stroke-width="6" stroke-linecap="round" opacity="0.9"/></g>`;
  return s;
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">${inner}</svg>`;

// 인물별 ─────────────────────────────────────────────
const P = {
  서하린(e) {
    const c = { skin: "#f6dccb", shade: "#e6b9a6", iris: "#3d8bd8", suit: "#1e2a44", accent: "#4aa3ff", brow: "#7d8ca6" };
    const H = "#cdd9ea", Hs = "#93a3bb";
    let s = body(c);
    // 포니테일(뒤)
    s += `<path d="M236 120 C320 120 330 230 312 330 C300 400 330 440 350 470 C300 460 270 410 280 340 C290 270 280 200 246 170Z" fill="${H}" stroke="${INK}" stroke-width="4.5"/>`;
    s += `<path d="M290 220 C300 290 286 350 306 420" fill="none" stroke="${Hs}" stroke-width="6"/>`;
    s += `<path d="M132 210 C122 120 170 84 210 86 C262 88 284 130 270 214 L262 214 C258 160 240 140 200 140 C160 140 142 170 140 214Z" fill="${H}" stroke="${INK}" stroke-width="4.5"/>`;
    s += head(c, e);
    // 앞머리(옆으로 넘김)
    s += `<path d="M138 196 C134 130 176 98 214 100 C252 102 270 134 264 190 C250 160 232 146 214 140 C222 162 212 186 196 200 C200 178 194 160 180 150 C172 172 158 186 138 196Z" fill="${H}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="M170 116 C196 108 230 112 248 132" fill="none" stroke="#fff" stroke-width="5" opacity="0.6" stroke-linecap="round"/>`;
    // 헤드셋
    s += `<path d="M130 210 C124 120 170 76 212 78 C258 80 284 120 274 206" fill="none" stroke="#2a3346" stroke-width="9"/>`;
    s += `<rect x="114" y="206" width="26" height="46" rx="10" fill="#2a3346" stroke="${INK}" stroke-width="4"/><circle cx="127" cy="229" r="6" fill="#4aa3ff"/>`;
    s += `<path d="M130 248 C136 292 158 304 180 300" fill="none" stroke="#2a3346" stroke-width="5" stroke-linecap="round"/><circle cx="182" cy="300" r="6" fill="#2a3346"/>`;
    return s;
  },
  바우(e) {
    const c = { skin: "#e0b28e", shade: "#c48f6a", shade2: "#a8735a", iris: "#6b4a2a", suit: "#4a3424", accent: "#ff7a2a", wide: true, bodyW: 1.22, thickBrow: true, brow: "#2b1d15", my: 292 };
    const H = "#3b2a20";
    let s = body(c);
    s += head(c, e);
    // 수염 자국
    s += `<path d="M150 280 C160 326 186 340 200 340 C214 340 240 326 250 280 C236 312 220 322 200 322 C180 322 164 312 150 280Z" fill="#6a4a3a" opacity="0.28"/>`;
    // 반창고
    s += `<g transform="rotate(-18 246 262)"><rect x="230" y="254" width="34" height="13" rx="5" fill="#f3e2c4" stroke="${INK}" stroke-width="2.5"/><rect x="242" y="256" width="10" height="9" fill="#e6caa0"/></g>`;
    // 짧은 삐죽 머리
    s += `<path d="M126 186 L118 150 L140 156 L136 116 L162 132 L170 92 L192 120 L208 84 L222 120 L246 94 L250 132 L276 120 L266 158 L284 156 L274 188 C262 150 240 136 200 136 C160 136 138 150 126 186Z" fill="${H}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="M160 128 L176 112 M206 104 L214 120" stroke="#6a5040" stroke-width="5" stroke-linecap="round"/>`;
    return s;
  },
  유리(e) {
    const c = { skin: "#fbe3d6", shade: "#efc2b0", iris: "#b07cff", suit: "#2a2140", accent: "#c77dff", brow: "#5a3a86", blush: true };
    const H = "#8d5cc9", Hs = "#6a3fa3";
    let s = body(c);
    // 후드 칼라
    s += `<path d="M120 420 C140 380 170 372 200 372 C230 372 260 380 280 420 C250 404 230 400 200 400 C170 400 150 404 120 420Z" fill="#3a2f58" stroke="${INK}" stroke-width="4"/>`;
    // 목 헤드폰
    s += `<path d="M150 380 C150 420 250 420 250 380" fill="none" stroke="#1f2333" stroke-width="10"/><circle cx="148" cy="384" r="18" fill="#1f2333" stroke="${INK}" stroke-width="3"/><circle cx="252" cy="384" r="18" fill="#1f2333" stroke="${INK}" stroke-width="3"/><circle cx="148" cy="384" r="7" fill="#c77dff"/><circle cx="252" cy="384" r="7" fill="#c77dff"/>`;
    // 단발 뒷머리 + 경단 둘
    s += `<circle cx="140" cy="110" r="30" fill="${H}" stroke="${INK}" stroke-width="4.5"/><circle cx="260" cy="110" r="30" fill="${H}" stroke="${INK}" stroke-width="4.5"/>`;
    s += `<path d="M126 290 C112 200 130 110 200 106 C270 110 288 200 274 290 C260 300 250 300 244 292 L156 292 C150 300 140 300 126 290Z" fill="${H}" stroke="${INK}" stroke-width="4.5"/>`;
    s += head(c, e);
    s += `<path d="M138 210 C130 140 160 110 200 110 C240 110 270 140 262 210 C256 190 248 176 240 170 L232 196 L222 168 L206 194 L196 166 L180 192 L172 168 L160 194 C150 184 144 196 138 210Z" fill="${H}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="M162 124 C184 116 214 116 236 126" fill="none" stroke="#c9a6f2" stroke-width="5" opacity="0.8" stroke-linecap="round"/>`;
    s += `<path d="M130 230 C128 260 132 282 140 290 M270 230 C272 260 268 282 260 290" stroke="${Hs}" stroke-width="5" fill="none"/>`;
    // 둥근 안경
    s += `<g fill="rgba(200,230,255,0.18)" stroke="#2b2440" stroke-width="4"><circle cx="171" cy="232" r="25"/><circle cx="229" cy="232" r="25"/></g><path d="M196 230 Q200 224 204 230" stroke="#2b2440" stroke-width="4" fill="none"/>`;
    s += `<path d="M156 218 l10 -6 M214 218 l10 -6" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>`;
    return s;
  },
  차도윤(e) {
    const c = { skin: "#f2d6c4", shade: "#ddb3a0", iris: "#7fa6e0", suit: "#1a1e2a", accent: "#e0b84a", narrow: true, brow: "#b8c4d6" };
    const H = "#eef2f8", Hs = "#b8c4d6";
    let s = body(c);
    // 흰 머플러
    s += `<path d="M150 380 C170 410 230 410 250 380 L262 404 C236 440 164 440 138 404Z" fill="#f4f6fa" stroke="${INK}" stroke-width="4"/><path d="M226 420 L250 500 L226 504 L214 428Z" fill="#f4f6fa" stroke="${INK}" stroke-width="4"/>`;
    s += `<path d="M134 206 C122 130 160 92 204 92 C250 92 280 130 268 206 L258 206 C256 160 240 140 200 140 C162 140 146 162 142 206Z" fill="${Hs}" stroke="${INK}" stroke-width="4.5"/>`;
    s += head(c, e);
    // 뒤로 넘긴 머리 + 한 가닥
    s += `<path d="M136 196 C120 130 150 96 192 90 L170 70 L214 84 L216 60 L244 92 L270 78 L266 112 L296 116 L272 140 C282 160 276 180 266 194 C256 156 236 134 206 130 C178 130 154 150 136 196Z" fill="${H}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="M150 156 C176 122 220 112 256 136 M162 172 C188 146 224 142 250 156 M226 100 L252 120" fill="none" stroke="${Hs}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<path d="M206 132 C190 160 186 190 196 214 C178 196 176 164 192 136Z" fill="${H}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>`;
    // 금색 견장
    s += `<path d="M90 470 L150 450 L156 466 L96 488Z M310 470 L250 450 L244 466 L304 488Z" fill="#e0b84a" stroke="${INK}" stroke-width="3"/>`;
    return s;
  },
  "강 교관"(e) {
    const c = { skin: "#d9a988", shade: "#bd8a6a", shade2: "#9e6d55", iris: "#3a3a3a", suit: "#34402f", accent: "#ffb02e", wide: true, bodyW: 1.12, thickBrow: true, brow: "#55575d", narrow: true, my: 294 };
    let s = body(c);
    s += head(c, e);
    // 흉터
    s += `<path d="M160 186 L176 236" stroke="#9e5a4a" stroke-width="4" stroke-linecap="round"/><path d="M162 196 l8 -3 M166 210 l8 -3 M170 224 l8 -3" stroke="#9e5a4a" stroke-width="2.5"/>`;
    // 콧수염
    s += `<path d="M176 276 Q200 266 224 276 Q214 284 200 280 Q186 284 176 276Z" fill="#55575d" stroke="${INK}" stroke-width="2.5"/>`;
    // 짧은 회색 머리 옆선
    s += `<path d="M128 214 C126 170 134 150 146 140 L146 216Z M272 214 C274 170 266 150 254 140 L254 216Z" fill="#6d6f75" stroke="${INK}" stroke-width="3.5"/>`;
    // 장교 모자
    s += `<path d="M118 150 C120 90 170 62 214 64 C262 66 288 100 286 146 Z" fill="#2f3b2c" stroke="${INK}" stroke-width="4.5"/>`;
    s += `<path d="M112 150 L290 146 L292 164 L110 168Z" fill="#232c21" stroke="${INK}" stroke-width="4"/><path d="M128 166 C160 190 240 188 280 162 L282 172 C240 200 160 200 126 176Z" fill="#141a13" stroke="${INK}" stroke-width="3.5"/>`;
    s += `<path d="M200 92 l12 14 l-12 22 l-12 -22Z" fill="#ffb02e" stroke="${INK}" stroke-width="3"/><path d="M140 140 L262 136" stroke="#ffb02e" stroke-width="4"/>`;
    return s;
  },
  모아(e) {
    const c = { skin: "#f7d8c2", shade: "#e8b8a0", iris: "#3d9b6a", suit: "#2f6b4a", accent: "#ffd24a", brow: "#c25a1a", blush: true };
    const H = "#ff8a3a", Hs = "#d8641e";
    let s = `<path d="M60 560 C68 470 120 420 176 392 L224 392 C280 420 332 470 340 560Z" fill="#e8e2d0" stroke="${INK}" stroke-width="4.5"/>`;
    s += `<path d="M110 560 L120 470 L280 470 L290 560Z" fill="${c.suit}" stroke="${INK}" stroke-width="4"/><path d="M136 470 L150 400 L170 404 L160 470 M264 470 L250 400 L230 404 L240 470" fill="${c.suit}" stroke="${INK}" stroke-width="3.5"/><circle cx="160" cy="472" r="7" fill="#ffd24a" stroke="${INK}" stroke-width="2.5"/><circle cx="240" cy="472" r="7" fill="#ffd24a" stroke="${INK}" stroke-width="2.5"/>`;
    s += `<path d="M184 510 l30 0 l-4 22 l-22 0Z" fill="#26563a" stroke="${INK}" stroke-width="3"/><path d="M196 504 l0 -16 M204 504 l6 -14" stroke="#9aa2ad" stroke-width="5" stroke-linecap="round"/>`;
    // 뒷머리(부스스)
    s += `<path d="M128 250 C110 190 118 120 164 100 C200 84 250 92 272 130 C290 170 290 220 274 256 L262 220 L140 220Z" fill="${H}" stroke="${INK}" stroke-width="4.5"/>`;
    s += head(c, e);
    // 주근깨, 기름 자국
    s += `<g fill="#c9845e" opacity="0.7"><circle cx="156" cy="256" r="2"/><circle cx="164" cy="262" r="2"/><circle cx="150" cy="264" r="2"/><circle cx="244" cy="256" r="2"/><circle cx="236" cy="262" r="2"/><circle cx="250" cy="264" r="2"/></g>`;
    s += `<path d="M226 286 q14 -4 22 4" stroke="#4a4a52" stroke-width="5" stroke-linecap="round" opacity="0.55"/>`;
    // 앞머리(부스스)
    s += `<path d="M136 200 L130 168 C132 120 168 100 204 100 C246 100 272 128 268 176 L264 202 L250 176 L240 196 L226 166 L214 192 L200 164 L186 192 L176 166 L164 192 L152 174Z" fill="${H}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    s += `<path d="M120 150 L104 136 L126 136 M276 150 L294 132 L280 154" fill="${H}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    // 이마 위 고글
    s += `<path d="M132 148 C160 128 240 128 268 148" fill="none" stroke="#3a3f4a" stroke-width="10"/>`;
    s += `<g stroke="${INK}" stroke-width="4"><ellipse cx="172" cy="138" rx="24" ry="18" fill="#3a3f4a"/><ellipse cx="228" cy="138" rx="24" ry="18" fill="#3a3f4a"/></g><ellipse cx="172" cy="138" rx="16" ry="11" fill="#8fe8ff"/><ellipse cx="228" cy="138" rx="16" ry="11" fill="#8fe8ff"/><path d="M164 132 l8 -4 M220 132 l8 -4" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    return s;
  },
  // 노을: 기체 AI 아바타. 육각 틀 속 주황 눈
  노을(e) {
    const col = e === "angry" ? "#ff5a3a" : "#ff9a3a", glow = e === "sad" ? 0.55 : 0.9;
    let s = `<defs><radialGradient id="g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="${col}" stop-opacity="0.45"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>`;
    s += `<circle cx="200" cy="270" r="190" fill="url(#g)"/>`;
    s += `<path d="M200 90 L340 170 L340 360 L200 440 L60 360 L60 170Z" fill="rgba(18,22,34,0.88)" stroke="${col}" stroke-width="6"/>`;
    s += `<path d="M200 118 L316 184 L316 346 L200 412 L84 346 L84 184Z" fill="none" stroke="${col}" stroke-width="2" opacity="0.45"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M96 ${190 + i * 18} L304 ${190 + i * 18}" stroke="${col}" stroke-width="1" opacity="0.12"/>`;
    // 눈
    if (e === "smile") s += `<path d="M150 278 Q200 222 250 278" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" opacity="${glow}"/>`;
    else if (e === "sad") s += `<path d="M150 262 Q200 296 250 262" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" opacity="${glow}"/><circle cx="200" cy="258" r="10" fill="${col}" opacity="0.6"/>`;
    else {
      const r = e === "surprise" ? 62 : e === "angry" ? 40 : 50, ry = e === "angry" ? 24 : e === "serious" ? 30 : r;
      s += `<ellipse cx="200" cy="262" rx="${r}" ry="${ry}" fill="none" stroke="${col}" stroke-width="10" opacity="${glow}"/>`;
      s += `<ellipse cx="200" cy="262" rx="${r * 0.42}" ry="${ry * 0.42}" fill="${col}" opacity="${glow}"/><circle cx="${200 + r * 0.18}" cy="${262 - ry * 0.18}" r="${r * 0.12}" fill="#fff" opacity="0.9"/>`;
      if (e === "angry") s += `<path d="M140 220 L190 236 M260 220 L210 236" stroke="${col}" stroke-width="8" stroke-linecap="round"/>`;
    }
    s += `<path d="M120 360 L150 360 L160 350 L240 350 L250 360 L280 360" fill="none" stroke="${col}" stroke-width="4" opacity="0.7"/>`;
    s += `<text x="200" y="404" text-anchor="middle" font-family="monospace" font-size="22" font-weight="700" fill="${col}" opacity="0.85">XN-0</text>`;
    return s;
  },
  에이아(e) {
    let s = `<defs><radialGradient id="r" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#ff2d3d" stop-opacity="0.5"/><stop offset="1" stop-color="#ff2d3d" stop-opacity="0"/></radialGradient></defs><circle cx="200" cy="260" r="200" fill="url(#r)"/>`;
    for (let i = 0; i < 4; i++) s += `<circle cx="200" cy="260" r="${70 + i * 34}" fill="none" stroke="#ff4a5a" stroke-width="${4 - i * 0.7}" stroke-dasharray="${i % 2 ? "14 10" : "40 8"}" opacity="${0.9 - i * 0.18}"/>`;
    s += `<path d="M200 140 L280 230 L250 340 L200 370 L150 340 L120 230Z" fill="#1a0c12" stroke="#ff4a5a" stroke-width="5"/>`;
    s += `<path d="M120 230 L200 262 L280 230 M200 262 L200 370" fill="none" stroke="#ff4a5a" stroke-width="2" opacity="0.5"/>`;
    const ry = e === "angry" ? 9 : 14;
    s += `<ellipse cx="200" cy="250" rx="46" ry="${ry}" fill="#ff2d3d"/><ellipse cx="200" cy="250" rx="12" ry="${ry * 0.8}" fill="#fff" opacity="0.9"/>`;
    return s;
  },
  바르가(e) {
    let s = `<path d="M40 560 C50 460 110 410 170 392 L230 392 C290 410 350 460 360 560Z" fill="#2b2f3a" stroke="${INK}" stroke-width="5"/>`;
    s += `<path d="M60 560 L80 470 L150 430 L170 500Z M340 560 L320 470 L250 430 L230 500Z" fill="#3b404d" stroke="${INK}" stroke-width="4"/><path d="M90 480 l50 -30 M310 480 l-50 -30" stroke="#ff2d3d" stroke-width="4"/>`;
    s += `<path d="M168 330 L168 396 L232 396 L232 330Z" fill="#1f222b" stroke="${INK}" stroke-width="4"/><path d="M172 350 L228 350 M172 370 L228 370" stroke="#3b404d" stroke-width="5"/>`;
    s += `<path d="M130 180 C130 110 170 86 200 86 C230 86 270 110 270 180 L262 300 L224 340 L176 340 L138 300Z" fill="#3b404d" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M140 120 L100 70 L150 104Z M260 120 L300 70 L250 104Z" fill="#2b2f3a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M146 214 L254 214 L246 244 L154 244Z" fill="#0d0f14" stroke="${INK}" stroke-width="4"/>`;
    const w = e === "angry" ? 88 : 60;
    s += `<rect x="${200 - w / 2}" y="223" width="${w}" height="12" rx="6" fill="#ff2d3d"/><rect x="${200 - w / 4}" y="226" width="${w / 2}" height="6" rx="3" fill="#ffd0d0"/>`;
    s += `<path d="M160 270 L240 270 M164 290 L236 290 M172 310 L228 310" stroke="#2b2f3a" stroke-width="6" stroke-linecap="round"/><path d="M200 100 L200 196" stroke="#2b2f3a" stroke-width="6"/>`;
    return s;
  },
};

export const HAS_PORTRAIT = new Set([...Object.keys(P), ...Object.keys(ART)]);
// 등록된 일러스트(전신 입간판)가 있는 인물
export const hasArt = (who) => !!ART[who];
export function portrait(who, expr = "normal") {
  const A = ART[who];
  if (A) return `img/story/chars/${A.id}_${(A.exprs || ["normal"]).includes(expr) ? expr : "normal"}.${A.ext || "png"}`;
  if (!P[who]) return null;
  const k = `${who}:${expr}`;
  if (!cache.has(k)) cache.set(k, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg(P[who](expr))));
  return cache.get(k);
}
