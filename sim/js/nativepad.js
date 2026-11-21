// 안드로이드 앱(웹뷰)용 게임패드 다리: 웹뷰는 Gamepad API 를 지원하지 않아서,
// 앱(MainActivity)이 패드·조종기 입력을 읽어 window.__nativePad(...) 로 넘겨준다.
// 여기서 그것을 표준 Gamepad 객체 모양으로 만들어 navigator.getGamepads() 에 끼워 넣는다 (브라우저에서는 아무 일도 하지 않음)
const pads = new Map();   // 안드로이드 장치 id → 가짜 Gamepad
let hooked = false;

function hook() {
  if (hooked) return;
  hooked = true;
  const orig = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  const list = () => {
    let real = [];
    try { real = Array.from(orig() || []); } catch (_) { /* 막힌 환경 */ }
    const out = real.slice();
    for (const p of pads.values()) out[p.index] = p;
    return out;
  };
  try { Object.defineProperty(navigator, "getGamepads", { value: list, configurable: true }); }
  catch (_) { navigator.getGamepads = list; }
}

function fire(type, pad) {
  const e = new Event(type);
  e.gamepad = pad;
  dispatchEvent(e);
}

// dev: 장치 id, name: 이름, std: 표준 배치 여부, axes: 숫자 배열, buttons: 0..1 값 배열
window.__nativePad = (dev, name, std, axes, buttons) => {
  hook();
  let p = pads.get(dev);
  const isNew = !p;
  if (isNew) {
    let index = 0;
    const used = new Set([...pads.values()].map((x) => x.index));
    while (used.has(index)) index++;
    p = { id: name, index, connected: true, mapping: std ? "standard" : "", axes: [], buttons: [], timestamp: 0, vibrationActuator: null };
    pads.set(dev, p);
  }
  p.axes = axes.slice();
  p.buttons = buttons.map((v) => ({ pressed: v > 0.5, touched: v > 0.05, value: v }));
  p.timestamp = performance.now();
  if (isNew) fire("gamepadconnected", p);
};

window.__nativePadGone = (dev) => {
  const p = pads.get(dev);
  if (!p) return;
  pads.delete(dev);
  p.connected = false;
  fire("gamepaddisconnected", p);
};
