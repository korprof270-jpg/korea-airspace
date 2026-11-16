// 대화 장면 소리 목록 (의존성 없음 — vn.js·music.js·tools/check-scenes.mjs 가 함께 쓴다)

// 분위기 음악. 대본에서 "@bgm 키" 로 바꾸고 "@bgm -" 로 끈다("@bgm auto" = 배경 기본값으로)
export const MOODS = {
  calm: "평온",
  daily: "일상",
  tense: "긴장",
  sad: "슬픔",
  resolve: "결의·고조",
  mystery: "미스터리",
  eia: "적·에이아",
  space: "우주·에일",
};

// 대본이 음악을 정하지 않았을 때 배경(@bg)마다 고르는 기본 분위기
export const BG_MOOD = {
  black: "mystery", briefing: "calm", hangarin: "daily", night: "calm", lab: "mystery", control: "tense",
  arena: "daily", airbase: "daily", empire: "eia", city: "daily", cityfire: "tense", canyon: "tense", canyonbase: "tense", factory: "tense",
  island: "calm", snow: "calm", snowstrike: "tense", palace: "mystery", moon: "space", moonsky: "space",
  eia: "eia", eiafactory: "eia", fortress: "eia", titan: "eia", wreck: "sad", noeul: "mystery", rival: "daily", squad: "resolve",
};

// 대본 "@sfx 이름" 으로 쓸 수 있는 효과음 (audio.js 에 합성 정의가 있다)
export const SCENE_SFX = [
  "warn", "static", "beep", "explode", "bigkill", "lap", "gate", "pickup", "lock", "emp", "shieldup", "boost", "whoosh", "click",
  "door", "alarm", "radio", "farboom", "steps", "heartbeat", "notify", "rumble", "keys",
];
