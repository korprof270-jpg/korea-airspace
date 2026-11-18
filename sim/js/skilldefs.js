// 스킬 정의 (상점·격납고·인게임 공용). 게이지(0~100)가 cost 이상이면 쓸 수 있고, 쓰면 cost 만큼 줄어든다
// 게이지: 적에게 준 피해와 격추(점수)로 찬다 — skills.js 참고
export const SKILLS = {
  lockon: {
    name: "락온 일제사격", icon: "◎", color: 0x4dd8ff, cost: 60, dur: 4.5, price: 0,
    desc: "4.5초 동안 시야 안의 적을 모두 자동 조준해 열 없이 고속 연사합니다.",
    tag: "자동 조준",
  },
  overdrive: {
    name: "오버드라이브", icon: "»", color: 0xffc23a, cost: 50, dur: 5, price: 700,
    desc: "5초 동안 추력·최고 속도 2.5배, 받는 피해 절반. 스쳐 지나간 적에게 충돌 피해를 줍니다.",
    tag: "고속 이동",
  },
  swarm: {
    name: "스웜 미사일", icon: "✸", color: 0xff7a2a, cost: 70, price: 900,
    desc: "유도 미사일 16발을 앞쪽의 적 여럿에게 나눠 연속 발사합니다. 락온이 필요 없습니다.",
    tag: "연발 미사일",
  },
  emp: {
    name: "EMP 쇼크웨이브", icon: "ϟ", color: 0x9fc0ff, cost: 80, price: 1100,
    desc: "충전 후 반경 85m에 전자기 충격파. 적을 5초간 마비시키고 피해를 주며, 날아오는 미사일을 없앱니다.",
    tag: "광역 마비",
  },
  aegis: {
    name: "이지스 방벽", icon: "⬢", color: 0x6af0ff, cost: 60, dur: 8, price: 1000,
    desc: "8초 동안 강한 방벽을 두르고, 다가오는 적 레이저를 쏜 적에게 되돌려 보냅니다.",
    tag: "방어·반사",
  },
  orbital: {
    name: "궤도 포격", icon: "☄", color: 0xff3d6a, cost: 100, price: 1500,
    desc: "조준한 지점을 표시하고 1.4초 뒤 위성 레이저를 내리꽂아 반경 24m를 초토화합니다.",
    tag: "지점 폭격",
  },
};
export const SKILL_DEF = "lockon";
export const skillCss = (id) => "#" + (SKILLS[id] || SKILLS[SKILL_DEF]).color.toString(16).padStart(6, "0");
