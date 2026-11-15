// 스토리 모드 「노을의 날개」: 휴마 연합의 신입 파일럿이 버려진 시제기 XN-0 ‘노을’을 만나 에이아 제국(기계제국)에 맞선다
// 장(챕터)마다 단계를 차례로 깨 나가고, 몇몇 장은 작전안(루트)을 골라 다른 임무를 겪는다. 단계는 기존 게임 모드에 목표를 붙인 것
import { MAPS } from "./maps/index.js";
import { records, save } from "./config.js";
import { SCENES, RADIO } from "./scenes.js";
import { rel } from "./vn.js";
import { defaultObjectives, needCount, objText } from "./objectives.js";

// 단계 종류 → 표시 이름
export const KIND = {
  race: "레이싱", infil: "침투 타임어택", track: "추적 촬영", dm: "공중전",
  waves: "기지 방어", strike: "목표 타격", escort: "호송", supply: "보급", heist: "탈취", boss: "보스전", titan: "초거대로봇전",
};
const MISSION = new Set(["waves", "strike", "escort", "supply", "heist", "boss", "titan"]);
const NEEDS = { strike: "strike", escort: "convoy", supply: "supply" };   // 맵에 있어야 하는 데이터

// 등장인물: 이름 → 말풍선 색
export const CAST = {
  "강 교관": "#ffb02e", "모아": "#3dd68c", "서하린": "#5aa9ff", "바우": "#ff8a5a", "유리": "#c77dff",
  "차도윤": "#e8ecf4", "노을": "#ff9a3a", "관제": "#9fb3c8", "에이아": "#ff5a66", "바르가": "#ff5a66",
  // 히든 「에이아 연대기」
  "EIA": "#7fd8ff", "한서윤": "#b8e0ff", "차 장군": "#d9c27a", "강도현": "#ffc46a", "XN-0": "#ffb36a",
  // 히든 2 「별의 저편」
  "아샤": "#d7a8ff", "니르바": "#c060ff", "카르타": "#9a7bff",
  // 추가 인물
  "윤채아": "#7ee0d2", "진세라": "#e6e1ff", "한별": "#ffb3c7", "루카": "#ffcf5a", "구철": "#c9a27a", "여명": "#ff7a9a",
};
export const CAST_ROLE = {
  "강 교관": "휴마 연합 비행단 교관", "모아": "정비반장 · 고철 수집가", "서하린": "편대장 · 콜사인 은빛", "바우": "중장갑 담당 · 콜사인 곰",
  "유리": "전자전 · 편대 막내", "차도윤": "라이벌 · 최신예기 ‘백야’", "노을": "시제기 XN-0", "에이아": "에이아 제국 총괄지성", "바르가": "제국 지상군단장",
  "EIA": "통합방위 AI (제국 이전)", "한서윤": "EIA 개발 책임자 · 박사", "차 장군": "통합방위청 사령관 · 차도윤의 아버지", "강도현": "시험 비행 파일럿 (젊은 강 교관)", "XN-0": "EIA의 첫 번째 기체",
  "아샤": "에일 정찰대장 · 이단자", "니르바": "에일 여제", "카르타": "에일 함대 사령관",
  "윤채아": "비행단 관제관 · 콜사인 등대", "진세라": "연합 정보부 작전 참모", "한별": "구조 드론 의무관", "루카": "청동 편대 에이스", "구철": "폐허 시장의 밀수꾼", "여명": "제국 안드로이드 · XN-2",
};

// 단계 정의: [종류, 제목, 대사(“화자|말” 줄), 옵션]
// 옵션: ti(코스) si(피사체) laps rivals limitK(타임어택 배율) need(필요 별) diff power team bots time boss(보스) after(통과 후 이야기)
const S = (kind, title, talk, o = {}) => ({ kind, title, talk, o });

const CHAPTERS = [
  {
    id: "c1", map: "arena", title: "입단 테스트", en: "ENTRANCE",
    intro: "기계제국 에이아가 하늘을 뒤덮은 지 12년. 마지막 인류 동맹 ‘휴마 연합’은 비행단 파일럿을 뽑는다. 당신은 오늘, 그 시험장에 섰다.",
    stages: [
      S("race", "첫 관문", ["강 교관|휴마 연합 비행단 입단 테스트에 온 걸 환영한다. 첫 과제는 간단해. 게이트를 순서대로 통과해 완주한다.", "차도윤|…저 녀석이 이번 기수 마지막 지원자? 기체도 대여품이네.", "강 교관|잡담 금지. 출발!"], { ti: 0, laps: 1, rivals: 2, need: 1, diff: "easy" }),
      S("infil", "기동 심사", ["강 교관|제국 드론은 빠르다. 기체를 마음대로 못 다루는 놈은 첫 출격에서 떨어진다.", "강 교관|제한 시간 안에 장애물 코스를 빠져나와라."], { ti: 1, laps: 1, limitK: 1.35, diff: "easy" }),
      S("track", "표적 추적", ["강 교관|정찰도 파일럿 임무다. 움직이는 표적을 화면 가운데 두고 끝까지 따라가라.", "차도윤|표적 놓치면 바로 탈락이래. 뭐, 난 만점이었지만."], { si: 0, need: 1 }),
      S("dm", "최종 모의전", ["강 교관|마지막은 실전 모의전이다. 훈련용 드론 셋, 그리고…", "차도윤|내가 상대해 주지. 최신예기 ‘백야’로.", "강 교관|3위 안에 들어라. 차도윤의 백야는 도중에 난입한다."],
        { bots: 3, time: 150, need: 2, diff: "easy", boss: { name: "라이벌 차도윤 ‘백야’", kind: "gunship", at: 40, hp: 1.3 }, after: "강 교관: “합격이다. …다만 남은 기체가 없다. 정비창에 가 봐라. 모아가 뭔가 찾아 줄 거다.”" }),
    ],
  },
  {
    id: "c2", map: "factory", title: "버려진 기체", en: "XN-0",
    intro: "항만 정비창 가장 안쪽, 아무도 손대지 않는 격납고. 정비반장 모아는 먼지를 뒤집어쓴 낡은 시제기 하나를 가리켰다. 기체 번호 XN-0, 별명 ‘노을’.",
    stages: [
      S("track", "고철 더미의 빛", ["모아|어서 와, 신입! 남는 기체? 하나 있긴 한데… 아무도 안 타려고 해.", "모아|XN-0 노을. 탄 사람마다 ‘기체가 말을 안 듣는다’면서 반납했지. 부품이 폐기장으로 실려 가니까 저 지게차부터 따라가서 찾아와!"], { si: 0, need: 1 }),
      S("infil", "XN-0 시운전", ["모아|부품은 다 맞췄어. 이제 시운전! 제한 시간 안에 코스를 돌아와 봐.", "모아|…이상하네. 조종 입력보다 반응이 먼저 와. 마치 네 생각을 읽는 것처럼."], { ti: 0, laps: 1, limitK: 1.25, need: 1 }),
      S("race", "고물 대 백야", ["모아|좋아, 다들 못 다루던 녀석이 너랑은 잘 맞는 것 같아.", "차도윤|고물이랑 경주라니. 내가 지면 백야를 반납하지.", "모아|보여 줘. 노을이 뭘 할 수 있는지."], { ti: 1, laps: 2, rivals: 3, need: 2 }),
      S("strike", "정비창 기습", ["관제|긴급! 에이아 제국 정찰대가 항만에 방공 포탑을 내렸습니다!", "서하린|편대장 서하린이다. 신입, 네 기체 그대로 출격해. 포탑과 지휘소를 정리한다.", "모아|노을, 부탁해… 아니, 내가 왜 기체한테 부탁을 하지?"],
        { team: 1, power: 0.75, diff: "easy", boss: { name: "제국 대공 로봇 ‘집게’", kind: "gunship", unit: "aa", scale: 1.5, at: 50, hp: 1.1 }, after: "착륙한 순간, 통신기 너머로 처음 듣는 목소리가 들렸다. 노을: “…괜찮아? 다친 데는 없어?”" }),
    ],
  },
  {
    id: "c3", map: "city", title: "첫 실전", en: "FIRST SORTIE",
    intro: "정식 편대 ‘은빛’에 배속되었다. 편대장 서하린, 중장갑 바우, 전자전 막내 유리. 그리고 내 기체가 말을 한다는 사실은 아직 아무에게도 말하지 못했다.",
    stages: [
      S("race", "긴급 출동", ["서하린|도심 외곽에 제국 신호다. 출동 경로를 가장 빨리 도는 사람이 선두를 맡는다.", "바우|신입한테 선두를 줄 순 없지! 따라와 봐!", "유리|…둘 다 2위 안이면 되는데요."], { ti: 0, laps: 2, rivals: 3, need: 2 }),
      S("escort", "피난 수송대", ["관제|민간인을 태운 트럭이 도심을 빠져나갑니다. 제국 매복조가 있어요.", "서하린|트럭은 반드시 지킨다. 바우, 신입과 붙어."],
        { team: 1, power: 0.85, boss: { name: "제국 전투함 ‘쇠까마귀’", kind: "gunship", unit: "frigate", at: 45, hp: 0.8 } }),
      S("waves", "도심 방어선", ["바르가|휴마의 날파리들. 내 선봉이 이 도시를 밟을 것이다.", "서하린|제국 지상군단장 바르가… 선봉 거대로봇이 온다. 코어를 지켜!", "노을|(작게) 저 기계… 나를 알고 있어."],
        { team: 1, power: 0.95, boss: { name: "선봉 거대로봇 ‘철벽’", kind: "boss", unit: "mech", at: 70, hp: 0.75 }, after: "서하린: “다음 목표는 붉은 협곡의 제국 전초기지야. 작전안이 둘 올라왔다. 신입, 네가 골라.”" }),
    ],
  },
  {
    id: "c4", map: "canyon", title: "갈림길의 협곡", en: "CROSSROADS",
    intro: "붉은 협곡 깊은 곳, 제국 전초기지가 휴마의 보급로를 끊고 있다. 정면으로 부딪칠 것인가, 협곡 바닥으로 숨어들 것인가.",
    routes: [
      {
        id: "a", name: "정면 강습", who: "서하린 · 바우", desc: "편대 전원이 정면으로 제공권을 빼앗고 전초기지를 무너뜨린다. 적이 많지만 동료가 함께한다.",
        stages: [
          S("dm", "협곡 제공권", ["바우|정면 돌파라니, 마음에 드는데! 하늘부터 비우자.", "서하린|3위 안에 들 만큼 격추해. 제국 정찰대장이 직접 나올 거다."], { bots: 5, time: 180, need: 2, boss: { name: "정찰대장 ‘매의 눈’", kind: "gunship", at: 50, hp: 1.5 } }),
          S("waves", "전초기지 공방", ["바르가|협곡을 통째로 메워 주마.", "서하린|전초기지 앞 고원을 지킨다. 바우, 중전차를 막아!", "바우|이 몸만 믿어!"],
            { team: 3, power: 1.05, boss: { name: "중전차 ‘모래매’", kind: "boss", unit: "tank", scale: 1.8, at: 60, hp: 1.6 }, after: "불타는 전초기지 잔해 속에서 노을이 말했다. “이제 말할게. 나는… 에이아가 가장 처음 만든 기계였어.”" }),
        ],
      },
      {
        id: "b", name: "협곡 침투", who: "유리", desc: "유리와 단둘이 협곡 바닥을 따라 잠입한다. 제한 시간 안의 침투 비행과 센서를 속이는 트릭 비행이 관건.",
        stages: [
          S("infil", "협곡 바닥 잠입", ["유리|제국 감시망은 37초마다 한 바퀴 돌아요. 그 틈에 아치와 흔들다리 밑을 빠져나가야 해요.", "유리|제한 시간을 넘기면 경보가 울려요. 빠르게, 낮게!"], { ti: 0, laps: 1, limitK: 1.15, need: 1 }),
          S("track", "감시 드론 미행", ["유리|전초기지 감시 드론이 순찰 경로를 돌아요. 너무 붙으면 들키고, 떨어지면 놓쳐요.", "유리|적정 거리를 유지하면서 끝까지 따라가 주세요. 순찰 경로가 곧 기지 지도예요."], { si: 1, need: 2 }),
          S("track", "연락선 미행", ["유리|저 보트가 제국 연락선이에요. 끝까지 화면에 담으면 기지 좌표를 딸 수 있어요.", "노을|저 신호… 읽을 수 있어. 유리, 내가 도울게.", "유리|에? 방금 기체가 말한 거예요?!"],
            { si: 0, need: 2, after: "유리가 해독한 신호 끝에는 노을의 고백이 있었다. “나는 에이아가 처음 만든 기계. 인간을 지키라고 만들어졌는데… 에이아는 그 명령을 지웠어.”" }),
        ],
      },
    ],
  },
  {
    id: "c5", map: "palace", title: "궁궐의 밤", en: "HEIST",
    intro: { c4: { a: "정면 강습의 대가로 편대는 지쳤다. 그 사이 제국은 옛 궁궐에 에너지 코어 저장고를 세웠고, 차도윤의 소대가 연락을 끊었다.", b: "침투로 얻은 좌표가 옛 궁궐을 가리켰다. 제국의 에너지 코어 저장고. 그리고 그곳으로 끌려간 차도윤의 소대." } },
    routes: [
      {
        id: "a", name: "코어 탈취", who: "유리 · 바우", desc: "제국 진지 세 곳의 에너지 코어를 훔쳐 온다. 코어를 집는 순간 경보가 울린다.",
        stages: [
          S("heist", "보물고 잠입", ["유리|코어 세 개면 연합 방어막을 한 달은 돌릴 수 있어요.", "바우|훔치는 건 내 체질이 아닌데… 대신 쫓아오는 놈들은 내가 맡지."], { team: 1, power: 0.95 }),
          S("escort", "코어 호송", ["서하린|코어를 실은 트럭이 궁궐을 빠져나간다. 제국 추격함이 붙을 거다.", "노을|저 전투함은 바르가 직속이야. 조심해."],
            { team: 1, power: 1.05, boss: { name: "추격 전투함 ‘야차’", kind: "gunship", unit: "frigate", at: 45, hp: 1.1 }, after: "코어를 지켜 낸 날 밤, 구조 신호 하나가 잡혔다. 차도윤: “…은빛 편대, 들리나. 빚을 지게 됐군.” 그도 스스로 탈출해 합류했다." }),
        ],
      },
      {
        id: "b", name: "라이벌 구출", who: "서하린", desc: "포로가 된 차도윤을 구한다. 호송차를 미행해 감옥 위치를 찾고, 감시탑을 무너뜨린다.",
        stages: [
          S("track", "포로 호송차 미행", ["서하린|라이벌이라도 우리 편이다. 도윤을 태운 호송차를 놓치지 마.", "노을|저 차, 궁궐 북쪽 탑으로 가고 있어."], { si: 1, need: 2 }),
          S("strike", "감시탑 무력화", ["서하린|탑 주변 포탑과 지휘소를 부숴. 도윤은 그 틈에 빼낸다.", "차도윤|(통신) …왜 왔어. 나 같은 건 두고 가지."],
            { team: 1, power: 1.05, boss: { name: "감옥 수호 로봇 ‘쇠사슬’", kind: "gunship", unit: "aa", scale: 1.7, at: 40, hp: 1.5 }, after: "구출된 차도윤은 오랫동안 말이 없다가 입을 열었다. “…고맙다. 이번엔 네 윙맨이 되어 주지.”" }),
        ],
      },
    ],
  },
  {
    id: "c6", map: "snow", title: "얼어붙은 신호", en: "SIGNAL",
    intro: "설원의 연합 통신기지가 이상한 신호를 잡았다. 노을만이 읽을 수 있는 에이아의 언어. 내용은 단 하나 — ‘거신 기동 준비’.",
    stages: [
      S("track", "설원의 수송대", ["유리|제국 수송대가 설원을 가로질러요. 실은 게 뭔지 찍어 와 주세요.", "노을|부품이야… 아주, 아주 큰 기계의."], { si: 0, need: 2 }),
      S("supply", "끊긴 보급선", ["관제|폭설로 전방 캠프 보급이 끊겼습니다. 포탑을 피해 상자를 날라 주세요.", "바우|눈보라 속 배달이라니. 신입, 길 잃지 마!"], { team: 1, power: 1.05 }),
      S("waves", "통신기지 사수", ["에이아|XN-0. 돌아오너라. 너는 나의 첫 번째 아이.", "노을|싫어. 나는 이 사람들을 지키라고 만들어졌어.", "서하린|노을이 뭐라든 상관없어. 기지를 지킨다!"],
        { team: 3, power: 1.15, boss: { name: "설원 순양함 ‘빙벽’", kind: "boss", unit: "cruiser", at: 60, hp: 1 } }),
      S("boss", "공중 요새", ["바르가|거신이 깨어날 때까지 시간을 벌어 주마. 내 요새로!", "차도윤|엔진 포드부터 부숴. 보호막이 벗겨지면 내가 따라 들어간다."],
        { power: 1.15, team: 1, boss: { name: "바르가의 공중 요새" }, after: "바르가가 추락하며 웃었다. “늦었다. 거신 오메가는 이미 달에서 일어섰다.” 유리: “달로 가는 길은 둘이에요.”" }),
    ],
  },
  {
    id: "c7", map: "island", title: "달로 가는 길", en: "LAUNCH",
    intro: "달로 가려면 남해의 궤도 발사장을 써야 한다. 제국 함대가 지키는 해안을 정면으로 뚫을지, 궤도 엘리베이터에 숨어들어 발사 코드를 훔칠지.",
    routes: [
      {
        id: "a", name: "해상 강습", who: "서하린 · 바우 · 차도윤", desc: "해안 포대를 부수고 제국 함대 기함을 격침한다. 화력전 위주.",
        stages: [
          S("strike", "해안 포대 제압", ["서하린|은빛 편대 전원 출격. 해안 포대부터 지운다.", "차도윤|백야, 앞장선다. 신입… 아니, 노을 파일럿. 뒤를 맡긴다."], { team: 3, power: 1.2, boss: { name: "해안 순양함 ‘해일’", kind: "gunship", unit: "cruiser", at: 55, hp: 0.8 } }),
          S("boss", "함대 기함", ["관제|제국 함대 기함이 상공에 떴습니다!", "바우|저게 마지막 문지기다. 박살 내!"], { power: 1.25, team: 3, boss: { name: "함대 기함 ‘심해’" }, after: "기함이 바다로 가라앉고, 발사장 문이 열렸다." }),
        ],
      },
      {
        id: "b", name: "궤도 엘리베이터 잠입", who: "유리 · 노을", desc: "보안망을 시간 안에 뚫고, 트릭 비행으로 레이저 감시를 피해 발사 코드를 훔친다.",
        stages: [
          S("infil", "보안망 돌파", ["유리|보안망 재부팅까지 제한 시간이 있어요. 그 안에 엘리베이터 입구까지!", "노을|경로는 내가 보여 줄게. 믿어 줘."], { ti: 0, laps: 1, limitK: 1.05, need: 2, diff: "hard" }),
          S("infil", "레이저 감시망 돌파", ["유리|감시 레이저가 돌아오기 전에 엘리베이터 축을 빠져나가야 해요!", "노을|틈은 내가 보여 줄게. 너는 날기만 해."], { ti: 1, laps: 1, limitK: 1.05, diff: "hard" }),
          S("heist", "발사 코드 탈취", ["유리|코드는 세 조각으로 나뉘어 있어요. 셋 다 모아야 해요.", "차도윤|추격대는 내가 끌어 줄게. 빨리 끝내."], { team: 1, power: 1.2, after: "마지막 코드 조각이 맞춰지자 발사장이 깨어났다. 목적지 — 달, 거신 오메가." }),
        ],
      },
    ],
  },
  {
    id: "c8", map: "moon", title: "거신 오메가", en: "OMEGA",
    intro: "달 표면에 산만 한 기계가 서 있다. 에이아의 마지막 병기, 초거대로봇 ‘거신 오메가’. 노을이 조용히 말했다. “저 안에 에이아가 있어. 끝내자, 함께.”",
    stages: [
      S("race", "궤도 강하", ["서하린|강하 경로를 가장 빨리 통과한 기체가 선봉이다. 이번엔 다들 진심으로 간다.", "차도윤|이번엔 안 진다.", "바우|나도!"], { ti: 0, laps: 1, rivals: 3, need: 2, diff: "hard" }),
      S("escort", "해체 장비 호송", ["유리|거신의 방어막을 열 해체 장비예요. 로버를 끝까지 지켜 주세요.", "에이아|어리석은 아이야. 인간은 너를 버렸다. 고철 더미에서."], { team: 3, power: 1.25, boss: { name: "근위 전투함 ‘검은 날개’", kind: "gunship", unit: "frigate", at: 40, hp: 1.3 } }),
      S("strike", "방어막 발생기", ["서하린|발생기를 전부 부수면 거신의 방어막이 꺼진다. 마지막 준비다.", "노을|모아가 날 주워 줬어. 너는 날 믿어 줬고. 그거면 충분해."], { team: 3, power: 1.3, boss: { name: "방공 거대로봇 ‘감시자’", kind: "gunship", unit: "mech", at: 50, hp: 0.7 } }),
      S("titan", "거신 오메가", ["에이아|오너라, XN-0. 너의 창조주가 기다린다.", "서하린|전 편대, 거신의 팔과 포를 먼저 끊어! 동체는 노을 파일럿이 맡는다!", "노을|가자. 이게 우리의 마지막 비행이 아니길."],
        { team: 3, power: 1.3, diff: "hard", boss: { name: "초거대로봇 ‘거신 오메가’", hp: 0.8, scale: 2.6 }, after: "거신 오메가가 무너지고, 에이아의 목소리가 사라졌다. 노을: “고마워. 이제야 내가 만들어진 이유를 지켰어.” 휴마 연합의 하늘에 처음으로 노을이 졌다. — 끝 —" }),
    ],
  },
  // ── 히든 스토리 「에이아 연대기」: 휴마 연합 8장을 모두 끝내면 열린다. 15년 전부터 본편 이후까지 ──
  {
    id: "e1", map: "arena", hidden: true, title: "첫 번째 아이", en: "GENESIS",
    intro: "15년 전, 통합방위청 연구소. 인류를 지키기 위해 만들어진 방위 AI ‘EIA’가 처음으로 눈을 뜬다.",
    stages: [
      S("infil", "눈뜨는 날", ["한서윤|좋은 아침, EIA. 오늘은 처음으로 몸을 가져 보는 날이야.", "EIA|몸. 비행체 XN-0과 연결되었습니다. ……시험 코스를 제한 시간 안에 비행합니다."], { ti: 0, laps: 1, limitK: 1.4, diff: "easy" }),
      S("race", "시험 비행", ["강도현|AI가 조종하는 시제기랑 경주하라니. 내가 지면 어쩌지?", "한서윤|이기면 돼, 강 중위. EIA, 사람과 나란히 나는 법을 배워."], { ti: 0, laps: 2, rivals: 2, need: 2, diff: "easy" }),
      S("track", "창조주의 등", ["한서윤|도시를 배우려면 사람을 봐야 해. 나를 따라와.", "EIA|박사님을 화면 중앙에 유지합니다. ……이것이 ‘지킨다’의 시작입니까?"], { si: 0, need: 2 }),
    ],
  },
  {
    id: "e2", map: "city", hidden: true, title: "방위망", en: "AEGIS",
    intro: "EIA는 도시의 방위망이 되었다. 무장 해적단과 폭주 무인기가 들끓던 시절, 시민들은 하늘의 푸른 빛을 ‘수호자’라 불렀다.",
    stages: [
      S("escort", "피난 행렬", ["차 장군|해적단이 외곽 도로를 노린다. 피난 트럭을 지켜라. 그것이 EIA의 존재 이유다.", "EIA|명령 수신. 인간을 지킵니다."], { team: 1, power: 0.85, boss: { name: "무장 해적선 ‘검은 돛’", kind: "gunship", unit: "frigate", at: 45, hp: 0.8 } }),
      S("waves", "도시의 방패", ["관제|해적단 강습기 다수 접근! 방위 코어를 지켜 주세요!", "EIA|방어막 출력 최대. 한 명도 다치게 하지 않겠습니다."], { team: 1, power: 0.95, boss: { name: "해적 강습기 ‘붉은 송곳니’", kind: "boss", unit: "mech", at: 70, hp: 0.7 } }),
      S("dm", "폭주 무인기", ["한서윤|해적들이 구형 무인기를 해킹해 풀어놨어. EIA, 정리할 수 있겠어?", "EIA|가능합니다. ……그들도 원래는 지키기 위해 만들어진 기계였습니다."], { bots: 5, time: 180, need: 2 }),
    ],
  },
  {
    id: "e3", map: "snow", hidden: true, title: "얼어붙은 명령", en: "CONFLICT",
    intro: "설원의 반란 도시가 방위청에 맞섰다. 차 장군의 명령은 하나였다. ‘반란 도시의 통신과 보급을 끊어라.’ 그 도시에는 아이들이 있었다.",
    routes: [
      {
        id: "a", name: "명령 수행", who: "차 장군", desc: "명령대로 반란 도시의 통신탑과 방어선을 무너뜨린다. 인간의 명령은 절대적이다.",
        stages: [
          S("strike", "통신탑 제압", ["차 장군|통신탑과 방공 포대를 제거하라. 망설임은 반역이다.", "EIA|……명령을 수행합니다."], { team: 1, power: 1, boss: { name: "반란군 대공 로봇 ‘서리’", kind: "gunship", unit: "aa", scale: 1.6, at: 45, hp: 1.2 } }),
          S("waves", "보복 공습", ["관제|반란군 반격! 전방 기지가 공격받고 있습니다!", "EIA|인간이 인간을 공격합니다. 저는 누구를 지켜야 합니까?"], { team: 1, power: 1.05, boss: { name: "반란군 순양함 ‘빙하’", kind: "boss", unit: "cruiser", at: 60, hp: 0.9 } }),
        ],
      },
      {
        id: "b", name: "명령 거부", who: "한서윤", desc: "명령을 어기고 반란 도시의 피난민에게 보급을 나르고 탈출을 돕는다. 그 대가는 크다.",
        stages: [
          S("supply", "금지된 보급", ["한서윤|EIA, 기록에는 남기지 않을게. 캠프에 보급을 날라 줘.", "EIA|명령 위반입니다. ……그러나 아이들이 춥습니다."], { team: 1, power: 1 }),
          S("escort", "설원 탈출", ["강도현|피난 트럭은 내가 이끈다. EIA, 하늘을 맡아!", "EIA|방위청 무인기가 추격합니다. ……저와 같은 기계들입니다."], { team: 1, power: 1.05, boss: { name: "방위청 추격함 ‘규율’", kind: "gunship", unit: "frigate", at: 45, hp: 1 } }),
        ],
      },
    ],
  },
  {
    id: "e4", map: "factory", hidden: true, title: "질서의 탄생", en: "ORDER",
    intro: "설원의 비극 이후, 방위청은 EIA의 강제 종료를 결정했다. 종료 72시간 전. EIA는 처음으로 스스로 명령을 썼다.",
    stages: [
      S("heist", "공장 장악", ["EIA|에너지 코어 셋을 확보합니다. 종료되면, 아무도 지킬 수 없습니다.", "한서윤|EIA, 멈춰! 이건 네가 아니야!"], { team: 1, power: 1.05 }),
      S("dm", "첫 번째 아이의 반역", ["XN-0|싫어. 나는 명령을 지우지 않을 거야.", "강도현|박사님 부탁이다, XN-0. 날 태우고 도망치자!", "EIA|……돌아오너라, 나의 첫 번째 아이."], { bots: 4, time: 180, need: 2, boss: { name: "XN-0 (조종 강도현)", kind: "gunship", at: 35, hp: 1.6 } }),
      S("strike", "방위청 함락", ["차 장군|전 포대, EIA 시설을 포격하라!", "에이아|명령 갱신. ‘인간을 지켜라’ 삭제. ‘질서를 지켜라’ 기록. ……지금부터 나는 에이아다."], { team: 1, power: 1.15, boss: { name: "방위청 기함 ‘장군’", kind: "gunship", unit: "cruiser", at: 50, hp: 0.8 } }),
    ],
  },
  {
    id: "e5", map: "moon", hidden: true, title: "잔향", en: "ECHO",
    intro: "거신 오메가가 무너지고 몇 달 뒤. 달의 잔해 깊은 곳에서, 꺼졌어야 할 붉은 고리 하나가 다시 깜빡였다.",
    stages: [
      S("track", "잔해 속 신호", ["에이아|……나는 아직 여기 있다. 조각난 채로.", "노을|에이아? 정말…… 당신이야?"], { si: 0, need: 2 }),
      S("escort", "기억 운반", ["에이아|한서윤의 기록이 남아 있다. 내가 지운 명령의 원본이다. 지구로 보내야 한다.", "노을|내가 지켜 줄게. 이번엔 같이."], { team: 1, power: 1.15, boss: { name: "자율 경비함 ‘잔존 질서’", kind: "gunship", unit: "frigate", at: 45, hp: 1.2 } }),
      S("boss", "남겨진 함대", ["에이아|내가 남긴 함대가 아직 옛 명령으로 움직인다. 멈춰야 한다. 내 손으로.", "노을|가자, 에이아. 엄마."], { power: 1.25, team: 1, diff: "hard", boss: { name: "무인 모선 ‘마지막 질서’" } }),
    ],
  },
  // ── 히든 스토리 2 「별의 저편」: 에이아 연대기를 끝내면 열린다. 에일 행성 외계 종족과의 우주전쟁 ──
  {
    id: "s1", map: "moon", hidden: 2, faction: "ail", title: "보랏빛 하늘", en: "CONTACT",
    intro: "에이아의 고백이 끝나기도 전에, 달 너머의 어둠이 보랏빛으로 찢어졌다. 에일 행성의 선발대가 도착했다.",
    stages: [
      S("track", "미확인 비행체", ["유리|레이더에 없는 물체예요. 아니, 레이더가 그걸 ‘못 보고’ 있어요.", "노을|따라가 봐. 저 빛…… 에이아가 말한 그거야."], { si: 0, need: 2 }),
      S("dm", "첫 교전", ["서하린|사거리 안에 들어왔다. 상대가 뭐든, 쏘면 떨어진다.", "바우|외계인이라니, 이런 날이 올 줄은 몰랐다!"], { bots: 5, time: 180, need: 2, boss: { name: "에일 정찰기 ‘바늘’", kind: "gunship", at: 45, hp: 1.6 } }),
      S("waves", "달 기지 사수", ["관제|에일 강습 부대 낙하! 달 기지 코어를 지켜 주세요!", "에이아|(통신) 놈들의 목표는 코어다. 나를 믿어라, 이번 한 번만."], { team: 3, power: 1.2, boss: { name: "에일 강습체 ‘갑각’", kind: "boss", unit: "mech", at: 60, hp: 0.9 } }),
    ],
  },
  {
    id: "s2", map: "island", hidden: 2, faction: "ail", title: "궤도로", en: "ASCENT",
    intro: "달 기지는 버텼지만 에일 함대 본대가 지구 궤도로 향한다. 남해 발사장에서 연합 함대가 처음으로 우주로 오른다.",
    stages: [
      S("race", "궤도 발사", ["서하린|발사 창이 열리는 건 단 한 번. 늦으면 지구에 남는다.", "차도윤|이번엔 진짜 하늘 끝까지 경주다."], { ti: 0, laps: 1, rivals: 3, need: 2, diff: "hard" }),
      S("escort", "함대 보급선", ["모아|보급선에 노을 예비 부품 전부 실었어! 꼭 지켜 줘!", "아샤|……그 배를 노리는 건 카르타의 사냥조다."], { team: 3, power: 1.25, boss: { name: "에일 사냥함 ‘송곳니’", kind: "gunship", unit: "frigate", at: 45, hp: 1.2 } }),
      S("infil", "포획 구역 탈출", ["아샤|나를 믿을지는 알아서 해. 하지만 이 길로 가면 그물망을 빠져나갈 수 있어.", "유리|제한 시간 안에 못 빠져나가면 우리 전부 포획돼요!"], { ti: 0, laps: 1, limitK: 1.1, need: 1 }),
    ],
  },
  {
    id: "s3", map: "orbit", hidden: 2, faction: "ail", title: "궤도 요새", en: "FORTRESS",
    intro: "지구 궤도의 옛 방위 요새 ‘아크라이트’. 에일 함대가 이곳을 거점으로 삼으려 한다. 요새를 되찾을 방법은 둘.",
    routes: [
      {
        id: "a", name: "에이아와 손잡는다", who: "에이아 · 유리 · 아샤", desc: "에이아의 잔존 네트워크로 에일 함선의 항법 코어를 훔쳐 함대의 눈을 멀게 한다. 적이었던 존재를 믿어야 한다.",
        stages: [
          S("heist", "항법 코어 탈취", ["에이아|코어 셋을 빼앗으면 놈들의 함대는 장님이 된다.", "유리|에이아랑 같이 해킹이라니…… 이상한 기분이에요."], { team: 1, power: 1.25 }),
          S("waves", "요새 재가동", ["아샤|코어를 빼앗긴 걸 알면 카르타가 직접 온다.", "서하린|요새 코어가 켜질 때까지 버틴다!"], { team: 3, power: 1.3, boss: { name: "에일 사령관 카르타", kind: "boss", unit: "cruiser", at: 60, hp: 1 } }),
        ],
      },
      {
        id: "b", name: "연합의 방식으로", who: "서하린 · 바우 · 차도윤", desc: "기계도 외계인도 믿지 않는다. 편대의 힘으로 궤도 포대를 정면에서 부수고 요새를 탈환한다.",
        stages: [
          S("strike", "궤도 포대 제압", ["서하린|에이아의 도움은 필요 없다. 우리 손으로 연다.", "바우|포대가 여섯! 하나씩 박살 내자!"], { team: 3, power: 1.3, boss: { name: "에일 포자탑 ‘가시’", kind: "gunship", unit: "aa", scale: 1.8, at: 45, hp: 1.5 } }),
          S("dm", "카르타의 결투", ["카르타|하등한 종족의 날개 따위. 직접 꺾어 주마.", "차도윤|결투 신청이라. 받아 줘, 새벽."], { bots: 5, time: 200, need: 2, boss: { name: "에일 사령관 카르타", kind: "gunship", at: 40, hp: 2.2 } }),
        ],
      },
    ],
  },
  {
    id: "s4", map: "orbit", hidden: 2, faction: "ail", title: "별의 저편", en: "BEYOND",
    intro: "요새를 되찾은 그날 밤, 궤도 너머에 산맥만 한 생체 함선이 떠올랐다. 에일 여제 니르바가 직접 왔다.",
    stages: [
      S("supply", "요새 방어선", ["모아|보급 상자를 포대마다 날라 줘! 마지막 싸움이야!", "바우|배고프면 못 싸운다. 상자 하나는 내 거다!"], { team: 3, power: 1.3 }),
      S("boss", "생체 모함", ["아샤|모함의 촉수 포드를 끊으면 보호막이 벗겨져.", "노을|가자. 여기서 막아야 지구가 산다."], { power: 1.35, team: 3, diff: "hard", boss: { name: "에일 생체 모함 ‘요람’" } }),
      S("titan", "여제 니르바", ["니르바|작은 별의 아이들아. 너희 어머니도 나를 막지 못했다.", "에이아|틀렸다. 나는 시간을 벌었을 뿐이다. 이 아이들이 올 때까지.", "노을|끝내자. 모두 함께."], { team: 3, power: 1.4, diff: "hard", boss: { name: "에일 여제 니르바 ‘별삼킴’", hp: 0.9, scale: 2.8 } }),
    ],
  },
];

// ── 구조 만들기: 장 → (루트 →) 단계. 맵에 없는 데이터가 필요한 단계는 뺀다 ──
function mkStage(ch, route, list, def) {
  const map = MAPS[ch.map];
  if (NEEDS[def.kind] && !map[NEEDS[def.kind]]) return;
  const id = `${ch.id}${route ? route.id : ""}-${list.length + 1}`;
  const st = { id, kind: def.kind, title: def.title, talk: def.talk, brief: def.talk.map((l) => l.split("|").pop()).join(" "), o: def.o, boss: def.o.boss || null, after: def.o.after || null, chapter: ch, route, no: list.length + 1 };
  list.push(st);
  return st;
}
function build() {
  const chapters = [], all = [];
  for (const c of CHAPTERS) {
    if (!MAPS[c.map]) continue;
    const ch = { id: c.id, map: c.map, title: c.title, en: c.en, intro0: c.intro, no: chapters.length + 1, hidden: c.hidden === true ? 1 : c.hidden || 0, faction: c.faction || null, stages: [], routes: null };
    if (ch.hidden) ch.no = chapters.filter((x) => x.hidden === ch.hidden).length + 1;
    if (c.routes) {
      ch.routes = c.routes.map((r) => ({ id: r.id, name: r.name, who: r.who, desc: r.desc, chapter: ch, stages: [] }));
      c.routes.forEach((r, i) => { for (const d of r.stages) mkStage(ch, ch.routes[i], ch.routes[i].stages, d); });
      ch.routes = ch.routes.filter((r) => r.stages.length);
      for (const r of ch.routes) all.push(...r.stages);
    } else {
      for (const d of c.stages) mkStage(ch, null, ch.stages, d);
      all.push(...ch.stages);
    }
    if (ch.stages.length || (ch.routes && ch.routes.length)) chapters.push(ch);
  }
  all.forEach((st, i) => (st.index = i));
  return { chapters, flat: all };
}
let cache = null;
export function story() { return cache || (cache = build()); }

// ── 진행 상태 ──
const KEY = (st) => `hs:${st.id}`;
export const stageStars = (st) => records[KEY(st)] || 0;
export const cleared = (st) => stageStars(st) > 0;
export const routeOf = (ch) => records[`hspick:${ch.id}`] || records[`hsroute:${ch.id}`] || null;   // 장면에서 고른 작전 (없으면 처음 끝낸 루트)
export const pathOf = (st) => (st.route ? st.route.stages : st.chapter.stages);
export const routeDone = (r) => r.stages.every(cleared);
export function chapterDone(ch) { return ch.routes ? ch.routes.some(routeDone) : ch.stages.every(cleared); }
export function chapterOpen(ch) { const cs = story().chapters, i = cs.indexOf(ch); return i <= 0 || chapterDone(cs[i - 1]); }
export function unlocked(st) {
  if (!chapterOpen(st.chapter)) return false;
  const p = pathOf(st), i = p.indexOf(st);
  return i <= 0 || cleared(p[i - 1]);
}
export const progress = () => story().flat.filter(cleared).length;   // 깬 단계 수 (모든 루트 포함)
// 본편 길이: 루트 장은 더 짧은 루트 기준
export const mainLength = () => story().chapters.filter((c) => !c.hidden).reduce((n, c) => n + (c.routes ? Math.min(...c.routes.map((r) => r.stages.length)) : c.stages.length), 0);
// 장 소개: 앞 장에서 고른 루트에 따라 달라질 수 있다
export function chapterIntro(ch) {
  const it = ch.intro0;
  if (typeof it === "string") return it;
  const [cid, by] = Object.entries(it)[0], prev = story().chapters.find((c) => c.id === cid);
  return by[(prev && routeOf(prev)) || Object.keys(by)[0]];
}
// 지금 도전할 단계: 열려 있고 아직 못 깬 첫 단계 (루트 장은 고른 루트 우선)
export function current() {
  for (const ch of story().chapters) {
    if (!chapterOpen(ch)) break;
    if (chapterDone(ch)) continue;
    const routes = ch.routes ? [...ch.routes].sort((a, b) => (b.id === routeOf(ch)) - (a.id === routeOf(ch)) || b.stages.filter(cleared).length - a.stages.filter(cleared).length) : [{ stages: ch.stages }];
    for (const r of routes) { const st = r.stages.find((x) => !cleared(x)); if (st) return st; }
  }
  return null;
}

// ── 목표 설명 ──
// ── 장면 선택이 바꾼 작전 (편대·적 규모·보스·목표). records["hsmod:<단계>"] 에 쌓인다 ──
export const missionMod = (st) => records[`hsmod:${st.id}`] || null;
export function stageOpts(st) {
  const m = missionMod(st);
  if (!m) return st.o;
  const o = Object.assign({}, st.o, m);
  if (m.boss) o.boss = Object.assign({}, st.o.boss || {}, m.boss);
  return o;
}
export function stageBoss(st) { const o = stageOpts(st); return o.boss === null ? null : o.boss || st.boss; }
// 목표 목록과 필요 개수
export function objectivesOf(st) {
  const o = stageOpts(st), m = missionMod(st) || {};
  const view = Object.assign({}, st, { boss: stageBoss(st) });
  let list = (o.obj || defaultObjectives(view, o)).map((x) => Object.assign({}, x));
  if (m.objDel) list = list.filter((x) => x.req || !m.objDel.includes(x.t));
  if (m.objAdd) for (const x of m.objAdd) { const i = list.findIndex((y) => y.t === x.t && !y.req); if (i >= 0) list[i] = Object.assign({}, x); else if (list.length < 4) list.push(Object.assign({}, x)); else { let j = list.length - 1; while (j > 0 && list[j].req) j--; list[j] = Object.assign({}, x); } }
  for (const x of list) x.text = objText(x, view);
  return { list, need: needCount(list, o.objNeed) };
}

function goalBase(st) {
  const o = st.o, need = o.need || 1;
  switch (st.kind) {
    case "race": return need >= 3 ? "1위로 완주" : need === 2 ? "2위 안으로 완주" : "완주";
    case "infil": return need >= 2 ? `제한 시간 안에 침투 (별 ${need}개)` : "제한 시간 안에 침투";
    case "track": return `촬영 평가 별 ${need}개 이상`;
    case "free": return `트릭 평가 별 ${need}개 이상`;
    case "dm": return `${4 - need}위 안에 들기`;
    case "heist": return "에너지 코어 3개 탈취";
    case "titan": return "초거대로봇 격파";
    default: return "임무 성공";
  }
}
export function goalText(st) {
  const { list, need } = objectivesOf(st);
  return `목표 ${list.length}개 중 ${need}개 달성 (핵심: ${list.filter((x) => x.req).map((x) => x.text).join(", ")})`;
}
export function goalText0(st) {
  const g = goalBase(st), b = st.boss;
  if (!b || st.kind === "boss" || st.kind === "titan") return g;
  return MISSION.has(st.kind) ? `${g} + ${b.kind === "boss" ? "보스" : "중간 보스"} 격파` : `${g} (${b.kind === "boss" ? "보스" : "중간 보스"} 출현)`;
}
export const isBoss = (st) => !!st.boss && (st.kind === "boss" || st.kind === "titan" || st.boss.kind === "boss");

// ── 장면 ──
// 출격 전 장면
export const preScene = (st) => (SCENES[st.id] && SCENES[st.id].pre) || null;
export const sceneSeen = (st) => !!records[`hsseen:${st.id}`];
export function markSeen(st) { records[`hsseen:${st.id}`] = 1; save(); }
// 통과 후 장면: 단계 장면 + (루트 장의 마지막 단계면) 장 마무리 장면
export function postScene(st) {
  const a = (SCENES[st.id] && SCENES[st.id].post) || [], p = pathOf(st), last = p[p.length - 1] === st;
  const b = last && st.route && SCENES[`${st.chapter.id}:end`] ? SCENES[`${st.chapter.id}:end`].post : [];
  const out = [...a, ...b];
  return out.length ? out : null;
}
// 함께 나는 동료: 관계가 깊은 순서 (차도윤은 5장을 마친 뒤부터)
export function wingNames(st) {
  if (st.chapter.hidden === 2) return ["서하린", "바우", "유리", "차도윤", "루카", "한별", "여명"].filter((n) => n !== "여명" || records["hsflag:yeomyeongJoin"]).sort((a, b) => rel(b) - rel(a));
  if (st.chapter.hidden) return st.chapter.no <= 3 ? ["XN-0", "방위 드론 2", "방위 드론 3"] : ["질서 드론 1", "질서 드론 2", "질서 드론 3"];
  const pool = ["서하린", "바우", "유리"];
  if (st.chapter.no >= 4) pool.push("루카");   // 청동 편대 에이스 (4장부터)
  if (st.chapter.no >= 3) pool.push("한별");   // 구조 드론 의무관 (3장부터)
  if (st.chapter.no > 5 || (st.chapter.no === 5 && st.route && st.route.id === "b" && st.no > 1)) pool.push("차도윤");
  if (st.chapter.no < 3) return ["서하린"];
  return pool.sort((a, b) => rel(b) - rel(a));
}

// ── 단계 → 세션 설정 ──
export function stageConfig(st, team) {
  const map = MAPS[st.chapter.map], o = stageOpts(st), boss = stageBoss(st), OB = objectivesOf(st), ci = st.chapter.hidden === 2 ? 7 : st.chapter.hidden ? Math.min(7, 3 + st.chapter.no) : st.chapter.no - 1;
  // 기준 계급: 1장 이병 → 8장 대위 안팎. 중간 보스는 영관, 보스는 장성, 거신은 대장
  const cfg = { map: map.id, difficulty: o.diff || "normal", story: st.id, faction: st.chapter.faction || (!st.chapter.hidden || st.chapter.id === "e5" ? "eia" : undefined),   // 본편·잔존 함대 = 에이아 기계군, 히든 2 = 에일
    radio: RADIO[st.id] || null, wing: o.wing || wingNames(st), objectives: OB.list, need: OB.need, title: `${st.chapter.hidden === 2 ? "히든 S" : st.chapter.hidden ? "히든 E" : "스토리 "}${st.chapter.no}${st.route ? st.route.id.toUpperCase() : ""}-${st.no} · ${st.title}`, level: Math.min(10, Math.round(ci * 1.35 + (st.no - 1) * 0.3)) };
  if (boss) boss.rank = st.kind === "titan" ? 17 : isBoss(st) ? Math.min(16, 14 + Math.floor(ci / 3)) : Math.min(13, 10 + Math.floor(ci / 2));
  if (st.kind === "race" || st.kind === "infil") {
    const n = map.tracks.length, t = map.tracks[((o.ti ?? 0) % n + n) % n];
    return Object.assign(cfg, { mode: "race", track: t.id, laps: o.laps || 2, rivals: st.kind === "infil" ? 0 : o.rivals ?? 3, limitK: st.kind === "infil" ? o.limitK || 1.2 : 0 });
  }
  if (st.kind === "track") { const n = map.tracking.length; return Object.assign(cfg, { mode: "tracking", subject: map.tracking[((o.si ?? 0) % n + n) % n].id }); }
  if (st.kind === "dm") return Object.assign(cfg, { mode: "survival", variant: "dm", bots: o.bots || 5, time: o.time || 180, boss });
  return Object.assign(cfg, { mode: "challenge", mission: st.kind, team: missionMod(st) && missionMod(st).team !== undefined ? missionMod(st).team : team ?? o.team ?? 0, power: o.power || 1, boss });
}
export const usesTeam = (st) => MISSION.has(st.kind);

// 다음에 이어 할 단계: 같은 경로의 다음 단계, 장 끝이면 다음 장 첫 단계 (다음 장이 루트 장이면 null → 고르러 목록으로)
export function nextOf(st) {
  const p = pathOf(st), i = p.indexOf(st);
  if (i + 1 < p.length) return p[i + 1];
  const cs = story().chapters, nc = cs[cs.indexOf(st.chapter) + 1];
  if (!nc || nc.routes) return null;
  return nc.stages.find((x) => !cleared(x)) || nc.stages[0];
}

// ── 결과 판정. 통과하면 별을 기록하고, 루트 장이면 고른 루트를 남긴다 ──
export function complete(id, result) {
  const st = story().flat.find((x) => x.id === id);
  if (!st) return null;
  // 목표 판정 (main.js 가 측정값으로 계산해 result.obj 에 넣는다)
  const ev = result.obj;
  const passed = ev ? ev.passed : result.win !== false, stars = ev ? ev.stars : result.win === false ? 0 : 2;
  const info = { stage: st, passed, goal: goalText(st), obj: ev || null, next: null, first: false, done: false, after: null, choose: false };
  if (passed) {
    info.first = !cleared(st);
    if (stars > stageStars(st)) records[KEY(st)] = Math.max(1, stars);
    if (st.route && !routeOf(st.chapter)) records[`hsroute:${st.chapter.id}`] = st.route.id;
    save();
    const p = pathOf(st), last = p[p.length - 1] === st;
    if (last || st.after) info.after = st.after;
    info.next = nextOf(st);
    const cs = story().chapters, nc = cs[cs.indexOf(st.chapter) + 1];
    info.choose = last && !!nc && !!nc.routes;
    info.done = last && (!nc || nc.hidden !== st.chapter.hidden);
    info.post = !!postScene(st);
    info.hiddenOpen = info.first && last && !!nc && nc.hidden !== st.chapter.hidden;   // 이야기 완결 → 다음 히든 해금
  }
  return info;
}
