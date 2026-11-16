// 게임패드 종류 판별 · 종류별 축/버튼 배치 · 버튼 글자(글리프)
// 지원: Xbox(표준 배치) · PlayStation(DualShock/DualSense) · Switch Pro · 일반 게임패드 · RC 조종기(USB 조이스틱)
// 브라우저가 "standard" 배치로 정리해 주는 패드는 버튼 번호가 같다 — 0 아래 · 1 오른쪽 · 2 왼쪽 · 3 위 · 4/5 LB/RB · 6/7 LT/RT · 8/9 보기/메뉴 · 12~15 십자키

// 표준 배치 버튼 → 비행 중 동작
const STD_ACTIONS = { 0: "item", 1: "reset", 2: "camera", 3: "modeNext", 4: "missile", 5: "fire", 6: "missile", 7: "fire", 8: "hud", 9: "pause", 14: "itemNext", 15: "itemNext" };
// 표준 배치가 아닌 일반 게임패드(다이렉트인풋 계열): 흔히 0~3 = 1·2·3·4번, 4~7 = L1·R1·L2·R2, 8·9 = 셀렉트·스타트
const GEN_ACTIONS = { 0: "camera", 1: "item", 2: "reset", 3: "modeNext", 4: "missile", 5: "fire", 6: "missile", 7: "fire", 8: "hud", 9: "pause" };
// RC 조종기: 스위치가 버튼으로 잡힌다. 많아야 몇 개뿐이므로 자주 쓰는 것만
const RC_ACTIONS = { 0: "fire", 1: "missile", 2: "reset", 3: "camera", 4: "item", 5: "modeNext", 6: "pause" };

// 종류별 기본 축 배치 (위·오른쪽으로 밀면 + 가 되도록 inv)
const STD_AXES = { lx: { i: 0, inv: false }, ly: { i: 1, inv: true }, rx: { i: 2, inv: false }, ry: { i: 3, inv: true } };
// 일반 게임패드: 오른쪽 스틱이 2·5 또는 2·3 인 경우가 많다. 축이 6개 이상이면 2·5, 아니면 2·3
const GEN_AXES6 = { lx: { i: 0, inv: false }, ly: { i: 1, inv: true }, rx: { i: 2, inv: false }, ry: { i: 5, inv: true } };
// RC 조종기(EdgeTX·OpenTX 기본 AETR 순서): 0 에일러론(롤) · 1 엘리베이터(피치) · 2 스로틀 · 3 러더(요)
// 스틱 모드 2 기준 왼쪽 = 스로틀·요, 오른쪽 = 피치·롤
const RC_AXES = { lx: { i: 3, inv: false }, ly: { i: 2, inv: false }, rx: { i: 0, inv: false }, ry: { i: 1, inv: false } };

// 메뉴 조작: 확인·뒤로 버튼 번호 (Switch 는 오른쪽 A 가 확인, 아래 B 가 뒤로)
const MENU = { std: { ok: 0, back: 1 }, switch: { ok: 1, back: 0 }, generic: { ok: 1, back: 2 }, rc: { ok: 0, back: 1 } };

// 버튼 글자: 동작 → 화면 표시
const GLYPHS = {
  xbox: { ok: "A", back: "B", item: "A", reset: "B", camera: "X", modeNext: "Y", missile: "LB", fire: "RT", hud: "보기", pause: "메뉴", itemNext: "◀▶" },
  ps: { ok: "✕", back: "○", item: "✕", reset: "○", camera: "□", modeNext: "△", missile: "L1", fire: "R2", hud: "만들기", pause: "옵션", itemNext: "◀▶" },
  // Switch Pro 의 표준 배치: 아래 = B, 오른쪽 = A, 왼쪽 = Y, 위 = X
  switch: { ok: "A", back: "B", item: "B", reset: "A", camera: "Y", modeNext: "X", missile: "L", fire: "ZR", hud: "−", pause: "+", itemNext: "◀▶" },
  generic: { ok: "2", back: "3", item: "2", reset: "3", camera: "1", modeNext: "4", missile: "L1", fire: "R2", hud: "셀렉트", pause: "스타트", itemNext: "—" },
  rc: { ok: "SW1", back: "SW2", item: "SW5", reset: "SW3", camera: "SW4", modeNext: "SW6", missile: "SW2", fire: "SW1", hud: "—", pause: "SW7", itemNext: "—" },
  keyboard: { ok: "Enter", back: "Esc", item: "E", reset: "R", camera: "C", modeNext: "M", missile: "F", fire: "Space", hud: "H", pause: "Esc", itemNext: "Q" },
};

export const PAD_NAMES = { xbox: "Xbox 컨트롤러", ps: "PlayStation 컨트롤러", switch: "Switch Pro 컨트롤러", generic: "게임패드", rc: "RC 조종기" };

// RC 조종기·시뮬레이터 동글에 흔히 붙는 이름
const RC_RE = /radiomaster|frsky|taranis|horus|jumper|edgetx|opentx|betafpv|literadio|tbs|tango|mambo|flysky|fs-?i6|spektrum|realflight|interlink|rc ?sim|transmitter|usb joystick|ethos|boxer|zorro|pocket|t-?lite|t-?pro|crossfire|elrs|expresslrs|simulator/i;
const XBOX_RE = /xbox|xinput|microsoft|045e/i;
const PS_RE = /054c|dualshock|dualsense|playstation|sony|ps[345]|wireless controller/i;
const SW_RE = /057e|pro controller|nintendo|switch|joy-?con/i;

// gamepad 객체 → { type, name, std, actions, axes, menu }
export function detectPad(gp) {
  const id = gp.id || "", std = gp.mapping === "standard";
  let type;
  if (XBOX_RE.test(id)) type = "xbox";
  else if (PS_RE.test(id)) type = "ps";
  else if (SW_RE.test(id)) type = "switch";
  else if (RC_RE.test(id)) type = "rc";
  else if (std) type = "xbox";                                   // 이름을 모르는 표준 배치 패드는 Xbox 와 같은 위치로
  else if (gp.buttons.length <= 8 && gp.axes.length >= 4) type = "rc";   // 버튼이 거의 없고 축만 많으면 조종기
  else type = "generic";
  // 이름으로는 Xbox/PS/Switch 여도 표준 배치가 아니면(일부 브라우저·OS) 버튼 위치는 일반 패드 기준
  const layout = type === "rc" ? "rc" : std ? (type === "switch" ? "switch" : "std") : "generic";
  return {
    type, std, layout,
    name: PAD_NAMES[type],
    actions: layout === "rc" ? RC_ACTIONS : layout === "generic" ? GEN_ACTIONS : STD_ACTIONS,
    axes: type === "rc" ? RC_AXES : std ? STD_AXES : gp.axes.length >= 6 ? GEN_AXES6 : STD_AXES,
    menu: MENU[layout] || MENU.std,
    glyphs: GLYPHS[layout === "generic" ? "generic" : type] || GLYPHS.xbox,
  };
}

export function glyphsFor(type) { return GLYPHS[type] || GLYPHS.keyboard; }

// 일반 패드의 십자키는 "햇 스위치" 축 하나(−1 위 … 1 위-왼쪽, 중립은 1.28 근처)로 오는 경우가 많다
// 반환: { up, down, left, right }
export function readHat(v) {
  const o = { up: false, down: false, left: false, right: false };
  if (!(v >= -1.05 && v <= 1.05)) return o;
  const k = Math.round((v + 1) / 2 * 7);                         // 0 위 · 1 위오른 · 2 오른 · 3 아래오른 · 4 아래 · 5 아래왼 · 6 왼 · 7 위왼
  o.up = k === 0 || k === 1 || k === 7; o.right = k >= 1 && k <= 3; o.down = k >= 3 && k <= 5; o.left = k >= 5 && k <= 7;
  return o;
}
// 햇 스위치 축 찾기: 중립값(> 1.1)이 보이거나 이름 있는 위치(9번)에 있는 축
export function findHat(gp, known) {
  if (known !== undefined && known >= 0 && known < gp.axes.length) return known;
  for (let i = gp.axes.length - 1; i >= 4; i--) if (gp.axes[i] > 1.1) return i;
  return -1;
}
