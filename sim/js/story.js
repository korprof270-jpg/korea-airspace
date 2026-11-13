// 스토리 모드: 챕터(맵)마다 여러 단계를 차례로 깨 나간다. 단계는 기존 게임 모드에 목표를 붙인 것
import { MAPS } from "./maps/index.js";
import { records, save } from "./config.js";

// 단계 종류 → 표시 이름
export const KIND = {
  race: "레이싱", track: "추적 촬영", free: "묘기 비행", dm: "공중전", base: "거점전", cargo: "운반전",
  waves: "기지 방어", strike: "포탑 소탕", escort: "호송", supply: "보급", boss: "보스전",
};
const MISSION = new Set(["waves", "strike", "escort", "supply", "boss"]);
// 이 종류를 하려면 맵에 있어야 하는 데이터
const NEEDS = { strike: "strike", escort: "convoy", supply: "supply", boss: "boss" };

// 단계 정의 줄임꼴: [종류, 제목, 브리핑, 옵션]
// 옵션: ti(코스 번호) si(피사체 번호) laps rivals need(필요 별) diff(난이도) power(적 규모 배율) team(윙맨 수) bots time
const CHAPTERS = [
  {
    id: "arena", map: "arena", title: "입단 시험",
    intro: "하늘길 비행대의 문을 두드린 신입 파일럿. 실내 경기장에서 기본기를 증명해야 정식 대원이 된다.",
    stages: [
      ["race", "첫 비행", "교관: “게이트를 순서대로 통과해 한 바퀴만 돌아와. 순위는 상관없다, 완주만 해.”", { ti: 0, laps: 1, rivals: 1, need: 1, diff: "easy" }],
      ["free", "몸풀기", "교관: “롤이든 플립이든 좋아. 2분 안에 묘기 점수를 내 봐.”", { need: 1 }],
      ["track", "눈을 떼지 마", "교관: “정비 카트를 화면 한가운데 두고 끝까지 따라가. 촬영도 임무다.”", { si: 0, need: 1 }],
      ["dm", "모의 공중전", "교관: “훈련용 드론 셋이다. 레이저는 조준선에 올리면 나간다. 3위 안에 들어.”", { bots: 3, time: 120, need: 1, diff: "easy" }],
      ["boss", "졸업 시험", "교관: “마지막이다. 훈련용 모선의 엔진 포드 넷을 부수고 코어를 깨라. 윙맨을 붙여 주지.”", { power: 0.55, team: 1, diff: "easy" }],
    ],
  },
  {
    id: "city", map: "city", title: "네온 시티의 그림자",
    intro: "첫 배치지는 밤의 도심. 정체 모를 무인기 무리 ‘까마귀’가 빌딩 숲 사이에 나타나기 시작했다.",
    stages: [
      ["race", "도심 순찰", "관제: “순찰 코스를 돌며 이상 징후를 확인하세요. 2위 안으로 들어와야 다음 구역을 맡깁니다.”", { ti: 0, laps: 2, rivals: 3, need: 2 }],
      ["track", "수상한 차량", "관제: “신호를 내보내는 차량을 찾았습니다. 놓치지 말고 따라붙어 영상을 확보하세요.”", { si: 0, need: 1 }],
      ["escort", "증거 호송", "관제: “확보한 장비를 실은 트럭이 출발합니다. 까마귀가 매복해 있을 겁니다. 끝까지 지켜 주세요.”", { team: 1, power: 0.8 }],
      ["race", "옥상 추격", "관제: “정찰기 한 대가 옥상 사이로 달아납니다. 지름길로 따라잡으세요.”", { ti: -1, laps: 1, rivals: 3, need: 2 }],
      ["base", "광장 탈환", "관제: “까마귀가 광장에 거점을 세웠습니다. 편대와 함께 적 코어를 부수거나 점수로 눌러 이기세요.”", { bots: 5, time: 180 }],
    ],
  },
  {
    id: "factory", map: "factory", title: "항만의 밀수선",
    intro: "까마귀의 부품은 바다로 들어오고 있었다. 석양이 지는 항만에서 보급선을 끊어야 한다.",
    stages: [
      ["track", "야적장 잠복", "관제: “지게차 한 대가 수상한 상자를 옮깁니다. 들키지 않게 따라가며 찍으세요.”", { si: 0, need: 1 }],
      ["race", "크레인 사이로", "관제: “야적장 통로를 익혀 두세요. 곧 여기서 싸우게 됩니다.”", { ti: 0, laps: 2, rivals: 3, need: 2 }],
      ["strike", "방공망 제거", "관제: “부두에 방공 포탑 여섯과 지휘소가 깔렸습니다. 5분 안에 전부 치워야 본대가 들어옵니다.”", { team: 1 }],
      ["cargo", "화물 쟁탈", "관제: “남은 부품 상자를 먼저 챙기는 쪽이 이깁니다. 우리 착륙장으로 날라 주세요.”", { bots: 5, time: 180 }],
      ["waves", "부두 사수", "관제: “까마귀가 반격합니다. 다섯 차례 공습에서 우리 코어를 지켜 내세요.”", { team: 1, power: 0.9 }],
    ],
  },
  {
    id: "canyon", map: "canyon", title: "붉은 협곡 전초기지",
    intro: "밀수선의 항로를 거슬러 오르니 붉은 협곡이 나왔다. 고원의 전초기지가 고립되어 도움을 기다린다.",
    stages: [
      ["race", "강을 따라", "대장: “협곡 바닥으로 숨어 들어간다. 아치와 흔들다리 밑을 지나 호수까지 내려가라.”", { ti: 0, rivals: 3, need: 2 }],
      ["track", "정찰선 추적", "대장: “강을 내려가는 보트가 까마귀의 연락선이다. 끝까지 화면에 담아라.”", { si: 0, need: 2 }],
      ["supply", "끊긴 보급로", "대장: “캠프 네 곳에 보급이 끊겼다. 포탑을 피해 상자를 날라라. 시간이 없다.”", { team: 1 }],
      ["free", "협곡의 곡예사", "대장: “적 센서를 교란해야 한다. 요란하게 날아 줘. 점수가 높을수록 잘 속는다.”", { need: 2 }],
      ["waves", "고원 방어전", "대장: “놈들이 기지 위치를 알아냈다. 코어가 버티는 동안 다 떨어뜨려라.”", { team: 3, power: 1 }],
    ],
  },
  {
    id: "palace", map: "palace", title: "단풍 고궁의 밀서",
    intro: "까마귀를 부리는 자의 단서가 옛 궁궐에 숨겨져 있다. 단풍이 한창인 고궁에 적이 먼저 와 있었다.",
    stages: [
      ["race", "회랑을 가로질러", "학자: “문과 회랑이 길입니다. 지붕은 건드리지 말고 통과해 주세요.”", { ti: 0, laps: 2, rivals: 3, need: 2 }],
      ["track", "행렬을 따라", "학자: “행렬 속에 밀서를 가진 자가 있습니다. 눈에 띄지 않게 따라가 주세요.”", { si: 0, need: 2 }],
      ["escort", "밀서 호송", "학자: “밀서를 수레에 실었습니다. 성문을 나설 때까지 지켜 주십시오.”", { team: 1, power: 1 }],
      ["strike", "성벽의 포대", "대장: “놈들이 성벽에 포탑을 올렸다. 문화재는 건드리지 말고 포탑만 골라내라.”", { team: 1, power: 1 }],
      ["base", "궁궐 수복", "대장: “마당에 박힌 적 거점을 뽑아낸다. 편대 전원 출격.”", { bots: 7, time: 180 }],
    ],
  },
  {
    id: "snow", map: "snow", title: "설국의 통신소",
    intro: "밀서가 가리킨 곳은 눈 덮인 산맥. 산꼭대기 통신소가 까마귀의 명령을 중계하고 있다.",
    stages: [
      ["race", "활강", "대장: “슬로프를 타고 내려가며 지형을 익혀라. 2위 안에 들어.”", { ti: 0, laps: 2, rivals: 3, need: 2 }],
      ["track", "설상차 추적", "대장: “보급을 나르는 차량이다. 눈보라에 놓치지 마라.”", { si: 0, need: 2 }],
      ["supply", "고립된 산장", "대장: “산장 네 곳이 고립됐다. 얼기 전에 보급을 넣어라.”", { team: 1, power: 1 }],
      ["strike", "통신소 무력화", "대장: “포탑을 걷어내고 중계 코어를 부숴라. 명령이 끊기면 놈들이 흩어진다.”", { team: 1, power: 1.1 }],
      ["waves", "눈 속의 반격", "대장: “끊기기 전에 마지막 명령이 나갔다. 전부 이쪽으로 온다. 버텨라.”", { team: 3, power: 1.15 }],
    ],
  },
  {
    id: "island", map: "island", title: "화산섬 공장",
    intro: "중계가 끊기자 까마귀의 본거지가 드러났다. 열대 화산섬 깊숙이 드론 공장이 숨어 있다.",
    stages: [
      ["race", "해안선 침투", "대장: “레이더를 피해 낮게 돈다. 1위로 들어와야 들키지 않는다.”", { ti: 0, laps: 2, rivals: 3, need: 3 }],
      ["free", "분화구 다이브", "대장: “분화구 열기로 센서를 가린다. 과감하게 날아라.”", { need: 2 }],
      ["supply", "잠입조 지원", "대장: “섬에 내린 잠입조에게 장비를 넘겨라. 포탑이 지켜보고 있다.”", { team: 1, power: 1.1 }],
      ["escort", "폭약 운반", "대장: “폭약을 실은 차량이 공장으로 간다. 도착 못 하면 끝이다.”", { team: 3, power: 1.15 }],
      ["boss", "공장 수호기", "대장: “공장을 지키는 대형기다. 포드부터 떼어 내라.”", { power: 0.95, team: 3 }],
    ],
  },
  {
    id: "moon", map: "moon", title: "달 기지 최종전",
    intro: "공장이 무너지며 드러난 마지막 좌표는 달. 까마귀를 부리던 관제 AI가 달 기지에서 기다린다.",
    stages: [
      ["race", "월면 적응 비행", "관제: “기지 외곽을 한 바퀴 돕니다. 낯선 지형에 익숙해지세요.”", { ti: 0, laps: 2, rivals: 3, need: 2 }],
      ["strike", "방어 포대 제거", "대장: “착륙장을 덮은 포대를 걷어낸다. 본대가 내려올 길을 열어라.”", { team: 3, power: 1.2 }],
      ["waves", "교두보 사수", "대장: “내린 자리를 지킨다. 파상 공격이 온다.”", { team: 3, power: 1.25 }],
      ["escort", "코어 해체 장비", "대장: “해체 장비를 실은 로버를 관제탑까지 데려가라.”", { team: 3, power: 1.25 }],
      ["boss", "까마귀의 둥지", "대장: “저게 본체다. 여기서 끝낸다. 전 편대, 따라와라!”", { power: 1.3, team: 3, diff: "hard" }],
    ],
  },
];

// 지금 있는 맵과 데이터로 할 수 있는 단계만 추려 번호를 매긴다
function build() {
  const chapters = [], flat = [];
  for (const c of CHAPTERS) {
    const map = MAPS[c.map];
    if (!map) continue;
    const ch = { id: c.id, map: c.map, title: c.title, intro: c.intro, no: chapters.length + 1, stages: [] };
    for (const [kind, title, brief, o] of c.stages) {
      if (NEEDS[kind] && !map[NEEDS[kind]]) continue;
      if (kind === "waves" && !(map.combat && map.combat.blue)) continue;
      const st = { id: `${c.id}-${ch.stages.length + 1}`, kind, title, brief, o: o || {}, chapter: ch, index: flat.length, no: ch.stages.length + 1 };
      ch.stages.push(st); flat.push(st);
    }
    if (ch.stages.length) chapters.push(ch);
  }
  return { chapters, flat };
}
let cache = null;
export function story() { return cache || (cache = build()); }

export const progress = () => Math.min(records.story || 0, story().flat.length);   // 깬 단계 수 = 다음에 열린 단계 번호
export const unlocked = (st) => st.index <= progress();
export const stageStars = (st) => records[`story:${st.id}`] || 0;

// 목표 설명
export function goalText(st) {
  const o = st.o, need = o.need || 1;
  switch (st.kind) {
    case "race": return o.rivals ? (need >= 3 ? "1위로 완주" : need === 2 ? "2위 안으로 완주" : "완주") : "완주";
    case "track": return `촬영 평가 별 ${need}개 이상`;
    case "free": return `묘기 평가 별 ${need}개 이상`;
    case "dm": return `${4 - need}위 안에 들기`;
    case "base": case "cargo": return "우리 팀 승리";
    default: return "임무 성공";
  }
}

// 단계 → 세션 설정
export function stageConfig(st, team) {
  const map = MAPS[st.chapter.map], o = st.o;
  const cfg = { map: map.id, difficulty: o.diff || "normal", story: st.id };
  if (st.kind === "race") {
    const n = map.tracks.length, t = map.tracks[((o.ti ?? 0) % n + n) % n];
    return Object.assign(cfg, { mode: "race", track: t.id, laps: o.laps || 2, rivals: o.rivals ?? 3 });
  }
  if (st.kind === "track") { const n = map.tracking.length; return Object.assign(cfg, { mode: "tracking", subject: map.tracking[((o.si ?? 0) % n + n) % n].id }); }
  if (st.kind === "free") return Object.assign(cfg, { mode: "freestyle", session: "timed" });
  if (st.kind === "dm" || st.kind === "base" || st.kind === "cargo") return Object.assign(cfg, { mode: "survival", variant: st.kind, bots: o.bots || 5, time: o.time || 180 });
  return Object.assign(cfg, { mode: "challenge", mission: st.kind, team: team ?? o.team ?? 0, power: o.power || 1 });
}
export const usesTeam = (st) => MISSION.has(st.kind);

// 결과 판정. 통과하면 진행도를 올린다
export function complete(id, result) {
  const { flat } = story(), st = flat.find((x) => x.id === id);
  if (!st) return null;
  const need = st.o.need || 1, stars = result.stars ?? (result.win === false ? 0 : 3);
  const mustWin = MISSION.has(st.kind) || st.kind === "base" || st.kind === "cargo";
  const passed = mustWin ? result.win === true : st.kind === "dm" ? stars >= need : result.win !== false && stars >= need;
  const info = { stage: st, passed, goal: goalText(st), next: null, first: false, done: false };
  if (passed) {
    if (stars > stageStars(st)) records[`story:${st.id}`] = Math.max(1, stars);
    if (st.index === progress()) { records.story = st.index + 1; info.first = true; }
    save();
    info.next = flat[st.index + 1] || null;
    info.done = !info.next;
  }
  return info;
}
