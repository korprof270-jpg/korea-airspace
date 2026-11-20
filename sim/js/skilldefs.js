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

// ── 스킬 강화: Lv.1~5. Lv.1 = 기본 수치. Lv.3 · Lv.5 는 연출과 효과가 한 단계씩 달라지는 분기점 ──
export const SKILL_MAX = 5;
// 표: [Lv1, Lv2, Lv3, Lv4, Lv5]. rows: 격납고에 보여 줄 수치 [키, 이름, 단위]
const T = {
  lockon: { cost: [60, 60, 58, 56, 52], dur: [4.5, 5, 5.5, 6, 6.5], dmg: [10, 11, 12, 13, 15], targets: [8, 8, 10, 10, 12], range: [170, 175, 185, 190, 200],
    rows: [["dur", "지속", "초"], ["dmg", "한 발 피해", ""], ["targets", "동시 조준", "기"], ["cost", "게이지", "%"]],
    m3: "조준 고리 2겹 · 동시 조준 10기", m5: "끝날 때 조준 중인 적 모두에게 마무리 유도탄" },
  overdrive: { cost: [50, 50, 48, 46, 42], dur: [5, 5.5, 6, 6.5, 7], ram: [55, 65, 75, 88, 105], take: [0.5, 0.5, 0.42, 0.42, 0.33], reach: [6, 6, 7.5, 7.5, 9],
    rows: [["dur", "지속", "초"], ["ram", "충돌 피해", ""], ["take", "받는 피해", "×"], ["cost", "게이지", "%"]],
    m3: "음속 고리 2겹 · 충돌 범위 확대", m5: "끝나는 순간 충격파 폭발" },
  swarm: { cost: [70, 70, 68, 66, 62], n: [16, 18, 20, 22, 24], dmg: [42, 45, 48, 52, 56], targets: [8, 8, 10, 10, 12],
    rows: [["n", "미사일", "발"], ["dmg", "한 발 피해", ""], ["targets", "표적 분배", "기"], ["cost", "게이지", "%"]],
    m3: "2발씩 동시 발사 · 폭발 고리 추가", m5: "마지막에 대형 탄두 2발" },
  emp: { cost: [80, 80, 77, 74, 70], radius: [85, 92, 100, 108, 120], stun: [5, 5.5, 6, 6.5, 7.5], dmg: [40, 50, 60, 72, 85],
    rows: [["radius", "반경", "m"], ["stun", "마비", "초"], ["dmg", "피해", ""], ["cost", "게이지", "%"]],
    m3: "2차 파동이 한 번 더 훑는다", m5: "3중 파동 · 마비된 적끼리 연쇄 번개" },
  aegis: { cost: [60, 60, 58, 56, 52], dur: [8, 9, 10, 11, 12], shield: [260, 300, 340, 390, 450], refl: [1.6, 1.7, 1.85, 2, 2.3], reach: [5.5, 5.5, 7, 7, 8.5],
    rows: [["dur", "지속", "초"], ["shield", "방벽 내구", ""], ["refl", "반사 피해", "×"], ["cost", "게이지", "%"]],
    m3: "이중 방벽 · 반사 범위 확대", m5: "끝나는 순간 방벽이 터지며 주변 폭발" },
  orbital: { cost: [100, 100, 96, 92, 86], radius: [24, 26, 28, 30, 34], dmg: [380, 430, 480, 540, 620], burn: [0.9, 1.1, 1.4, 1.7, 2.2],
    rows: [["radius", "반경", "m"], ["dmg", "피해", ""], ["burn", "잔불 지속", "초"], ["cost", "게이지", "%"]],
    m3: "빔이 굵어지고 잔불이 오래 남는다", m5: "주변에 보조 빔 3발이 잇따라 꽂힌다" },
};
// 스킬 수치 (레벨 반영). lv 는 1~5 로 고정
export function skillStat(id, lv = 1) {
  const t = T[id] || T[SKILL_DEF], i = Math.max(1, Math.min(SKILL_MAX, Math.floor(+lv) || 1)) - 1, o = { lv: i + 1 };
  for (const [k, v] of Object.entries(t)) if (Array.isArray(v) && typeof v[0] === "number") o[k] = v[i];
  return o;
}
export const skillRows = (id) => (T[id] || T[SKILL_DEF]).rows;
export const skillMilestone = (id) => ({ m3: (T[id] || T[SKILL_DEF]).m3, m5: (T[id] || T[SKILL_DEF]).m5 });
// 설명글 (레벨 수치 반영)
export function skillDesc(id, lv = 1) {
  const s = skillStat(id, lv);
  switch (id) {
    case "lockon": return `${s.dur}초 동안 시야 안의 적을 최대 ${s.targets}기까지 자동 조준해 열 없이 고속 연사합니다.`;
    case "overdrive": return `${s.dur}초 동안 추력·최고 속도 2.5배, 받는 피해 ×${s.take}. 스쳐 지나간 적에게 충돌 피해 ${s.ram}.`;
    case "swarm": return `유도 미사일 ${s.n}발을 앞쪽의 적 여럿에게 나눠 연속 발사합니다. 락온이 필요 없습니다.`;
    case "emp": return `충전 후 반경 ${s.radius}m에 전자기 충격파. 적을 ${s.stun}초간 마비시키고 피해를 주며, 날아오는 미사일을 없앱니다.`;
    case "aegis": return `${s.dur}초 동안 강한 방벽을 두르고, 다가오는 적 레이저를 쏜 적에게 되돌려 보냅니다.`;
    case "orbital": return `조준한 지점을 표시하고 1.4초 뒤 위성 레이저를 내리꽂아 반경 ${s.radius}m를 초토화합니다.`;
  }
  return (SKILLS[id] || {}).desc || "";
}
