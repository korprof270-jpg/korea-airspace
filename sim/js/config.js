// 설정·기록 저장 (localStorage) 과 기체/조종 프리셋
const KEY = "haneulgil-fpv-v1";

export const FLIGHT_MODES = ["ACRO", "HORIZON", "ANGLE", "ALTHOLD", "LOITER"];
export const FLIGHT_MODE_INFO = {
  ACRO: { label: "ACRO", ko: "아크로 (수동)", desc: "자동 수평 없음. 스틱 = 회전 속도. 플립·롤 등 모든 기동 가능" },
  HORIZON: { label: "HORIZON", ko: "호라이즌", desc: "스틱을 놓으면 수평 복귀, 끝까지 밀면 플립·롤 가능" },
  ANGLE: { label: "ANGLE", ko: "앵글 (자동 수평)", desc: "스틱 = 기울기 각도. 놓으면 수평으로 복귀" },
  ALTHOLD: { label: "ALT HOLD", ko: "고도 유지", desc: "앵글 + 스로틀 중앙에서 고도 자동 유지" },
  LOITER: { label: "LOITER", ko: "로이터 (GPS)", desc: "스틱을 놓으면 제자리 정지. 스틱 = 이동 속도" },
};

// 스틱 모드: 왼쪽/오른쪽 스틱의 세로·가로 축이 어떤 채널인지
export const STICK_MODES = {
  1: { ly: "pitch", lx: "yaw", ry: "throttle", rx: "roll", desc: "왼쪽: 피치·요 / 오른쪽: 스로틀·롤" },
  2: { ly: "throttle", lx: "yaw", ry: "pitch", rx: "roll", desc: "왼쪽: 스로틀·요 / 오른쪽: 피치·롤" },
  3: { ly: "pitch", lx: "roll", ry: "throttle", rx: "yaw", desc: "왼쪽: 피치·롤 / 오른쪽: 스로틀·요" },
  4: { ly: "throttle", lx: "roll", ry: "pitch", rx: "yaw", desc: "왼쪽: 스로틀·롤 / 오른쪽: 피치·요" },
};

// 기체 등급 (비행 성능). 외형과는 별개로 고를 수 있다.
export const DRONE_CLASSES = {
  freestyle: {
    name: "프리스타일 5인치", desc: "균형 잡힌 만능 기체. 묘기와 일반 비행에 적합",
    mass: 0.72, twr: 6.0, cdaF: 0.013, cdaT: 0.032, pitchSpeed: 52, rateTau: 0.035, motorTau: 0.04, radius: 0.18, scale: 1.0,
  },
  racer: {
    name: "레이서 5인치", desc: "가볍고 빠르다. 추력이 강해 스로틀이 예민함",
    mass: 0.56, twr: 8.0, cdaF: 0.010, cdaT: 0.028, pitchSpeed: 62, rateTau: 0.028, motorTau: 0.03, radius: 0.17, scale: 0.95,
  },
  cine: {
    name: "시네우프 3인치", desc: "느리고 부드럽다. 트래킹·근접 촬영에 적합",
    mass: 0.42, twr: 3.4, cdaF: 0.016, cdaT: 0.030, pitchSpeed: 30, rateTau: 0.05, motorTau: 0.05, radius: 0.15, scale: 0.8,
  },
  longrange: {
    name: "롱레인지 7인치", desc: "묵직하고 안정적. 고속 순항과 운반에 유리",
    mass: 1.05, twr: 4.6, cdaF: 0.016, cdaT: 0.045, pitchSpeed: 58, rateTau: 0.05, motorTau: 0.06, radius: 0.22, scale: 1.3,
  },
  whoop: {
    name: "타이니 우프", desc: "손바닥만 한 초소형. 좁은 틈새 비행 연습용",
    mass: 0.032, twr: 3.0, cdaF: 0.0022, cdaT: 0.004, pitchSpeed: 16, rateTau: 0.04, motorTau: 0.03, radius: 0.06, scale: 0.4,
  },
};

// 레이트(조종 감도) 프리셋 — 중앙 감도/최대 각속도(°/s)/엑스포
export const RATE_PRESETS = {
  soft: { name: "부드럽게", rp: { center: 90, max: 420, expo: 0.3 }, yaw: { center: 90, max: 300, expo: 0.2 } },
  standard: { name: "표준", rp: { center: 150, max: 670, expo: 0.45 }, yaw: { center: 130, max: 500, expo: 0.3 } },
  race: { name: "레이싱", rp: { center: 200, max: 720, expo: 0.5 }, yaw: { center: 160, max: 560, expo: 0.3 } },
  freestyle: { name: "프리스타일", rp: { center: 180, max: 900, expo: 0.6 }, yaw: { center: 160, max: 700, expo: 0.45 } },
};

// HUD 표시 수준과 개별 계기 목록 (설정 화면·HUD 가 함께 사용)
export const HUD_DENSITY = ["full", "minimal", "off"];
export const HUD_DENSITY_NAMES = { full: "전체", minimal: "최소", off: "끄기" };
export const HUD_ITEMS = [
  ["battery", "배터리", "왼쪽 위 배터리 잔량"],
  ["sticks", "스틱 움직임", "좌·우 스틱 위치와 궤적"],
  ["speed", "속도계", "아래쪽 속도 표시 (km/h)"],
  ["altitude", "고도계", "아래쪽 고도 표시와 상승·하강률"],
  ["distance", "목표 거리", "다음 게이트·피사체·표적까지 거리"],
  ["mode", "비행 모드", "ACRO·ANGLE 등 현재 모드 배지"],
  ["throttle", "스로틀 게이지", "현재 추력 막대"],
  ["horizon", "수평선·자세", "피치 사다리와 기울기 표시"],
  ["compass", "나침반", "기수 방위와 목표 방향"],
  ["radar", "레이더", "전투 모드의 주변 적·아군·아이템"],
  ["gateArrow", "게이트 방향 안내", "다음 게이트 쪽을 가리키는 화살표"],
  ["guideLine", "코스 안내선", "다음 게이트까지 흐르는 화살표와 표지 빛기둥"],
];
// 한 번에 바꾸는 HUD 프리셋
export const HUD_PRESETS = {
  all: { name: "모두 켜기", on: null },
  race: { name: "레이싱", on: ["speed", "distance", "mode", "throttle", "compass", "gateArrow", "guideLine"] },
  cine: { name: "촬영", on: ["distance", "horizon"] },
  none: { name: "모두 끄기", on: [] },
};
export function applyHudPreset(id) {
  const p = HUD_PRESETS[id];
  if (!p) return;
  for (const [k] of HUD_ITEMS) settings.hud[k] = p.on ? p.on.includes(k) : true;
  settings.hud.density = "full";
  save();
}

export const DIFFICULTY = {
  easy: { name: "쉬움", bot: 0.6, aim: 0.35, dmg: 0.6 },
  normal: { name: "보통", bot: 0.8, aim: 0.6, dmg: 1.0 },
  hard: { name: "어려움", bot: 1.0, aim: 0.85, dmg: 1.3 },
};

export const DEFAULTS = {
  stickMode: 2,
  flightMode: "ANGLE",
  hoverThrottle: true,      // 스로틀 스틱 중앙 = 호버 (스프링 복귀 스틱·키보드용)
  invertPitch: false,
  ratePreset: "standard",
  rates: structuredClone(RATE_PRESETS.standard),
  angleLimit: 50,           // ANGLE/HORIZON 최대 기울기(°)
  loiterSpeed: 14,          // LOITER 최대 수평 속도(m/s)
  camTilt: 25,              // FPV 카메라 상향 각도(°)
  fov: 92,
  camera: "fpv",            // fpv | chase | los
  gamepad: {
    deadzone: 0.04,
    axes: { lx: { i: 0, inv: false }, ly: { i: 1, inv: true }, rx: { i: 2, inv: false }, ry: { i: 3, inv: true } },
  },
  touchSticks: "auto",      // auto | on | off
  quality: typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches ? "low" : "med", // low | med | high
  volume: 0.6,
  musicVolume: 0.5,
  difficulty: "normal",
  // HUD 표시 항목 (설정에서 켜고 끔). density: full | minimal | off, opacity 0.3~1, scale 0.8~1.3
  hud: {
    sticks: true, speed: true, altitude: true, distance: true, mode: true, horizon: true, compass: true, radar: true, gateArrow: true,
    throttle: true, guideLine: true, density: "full", opacity: 1, scale: 1,
  },
  // 화면 효과: 흔들림 세기(0~1.5), 색 번쩍임 세기(0~1), 진동(게임패드·모바일)
  fx: { shake: 1, flash: 1, rumble: true },
  autoFire: "touch",        // 자동 사격: off | touch(터치 조작일 때만) | on
  crashAssist: true,        // 가벼운 접촉은 튕겨내고 계속 비행
  drone: {
    cls: "freestyle",
    frame: "x", canopy: "pod", props: 3, skin: "solid",
    frameColor: "#1b1f27", accentColor: "#ff5a1f", propColor: "#21d4fd", ledColor: "#3dff7c", ledMode: "solid",
    trail: "off",
  },
};

function deepMerge(base, over) {
  if (over === null || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(over)) {
    out[k] = base && typeof base[k] === "object" && base[k] !== null ? deepMerge(base[k], over[k]) : over[k];
  }
  return out;
}

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; }
}

const stored = read();
export const settings = deepMerge(structuredClone(DEFAULTS), stored.settings || {});
export const records = stored.records || {}; // { "race:meadow:oval": {best: 12.3}, ... }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ settings, records })); } catch (_) { /* 저장 불가 환경 무시 */ }
}

export function resetSettings() {
  const drone = settings.drone;
  for (const k of Object.keys(settings)) delete settings[k];
  Object.assign(settings, structuredClone(DEFAULTS), { drone });
  save();
}

// 기록 갱신. lower=true 면 작은 값이 좋은 기록(시간), 아니면 큰 값(점수)
export function submitRecord(key, value, lower = false) {
  const cur = records[key];
  const better = cur === undefined || (lower ? value < cur : value > cur);
  if (better) { records[key] = value; save(); }
  return better;
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// 시드 고정 난수 (맵 생성이 매번 같도록)
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fmtTime(t) {
  if (!isFinite(t)) return "--:--.--";
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}
