// 폰을 세로로 들고 있어도 게임 화면은 가로로: 터치 기기에서 세로 화면이면 페이지 전체를 90° 돌려 그린다
// (브라우저·앱이 화면 회전을 막아 둔 경우에도 가로로 조종할 수 있다)
const de = document.documentElement;
const realW = () => de.clientWidth, realH = () => de.clientHeight;
let rotated = false;

export const isRotated = () => rotated;

// 화면(터치) 좌표 → 게임(돌린 뒤) 좌표
export function toGame(x, y, out) {
  if (rotated) { out.x = y; out.y = realW() - x; } else { out.x = x; out.y = y; }
  return out;
}

function apply() {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const want = coarse && realH() > realW() * 1.05;
  const b = document.body;
  if (want) {
    Object.assign(b.style, { position: "fixed", top: "0", left: `${realW()}px`, width: `${realH()}px`, height: `${realW()}px`, transformOrigin: "0 0", transform: "rotate(90deg)" });
  } else if (rotated) {
    for (const k of ["position", "top", "left", "width", "height", "transformOrigin", "transform"]) b.style[k] = "";
  }
  if (want !== rotated) { rotated = want; b.classList.toggle("rot", want); }
}

// 게임 코드가 쓰는 innerWidth/innerHeight 를 돌린 뒤의 크기로 보이게 한다
try {
  Object.defineProperty(window, "innerWidth", { configurable: true, get: () => (rotated ? realH() : realW()) });
  Object.defineProperty(window, "innerHeight", { configurable: true, get: () => (rotated ? realW() : realH()) });
} catch (_) { /* 재정의 불가 환경에서는 회전 없이 동작 */ }

apply();
// 캡처 단계에서 먼저 처리해 다른 resize 처리기가 새 크기를 보게 한다
addEventListener("resize", apply, true);
