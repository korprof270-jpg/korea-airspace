// 누리 대륙 3단계 지도 — ① 대륙 → ② 주요 지역(구역 맵 8곳) → ③ 지역 안 주요 구역(61곳)
//  구역: 지도 단위 중심(sx, sy) · 반경 r(m) · 테마 · 용도 · 연결된 정밀 맵(기존 단독 맵 id)
//  테마별 적·임무 성격(THEME)은 대륙 작전·돌파 작전이 구역 임무를 고를 때 쓴다
import { toW } from "./geo.js";

export const THEME = {
  city: { name: "도시", foes: ["드론 떼", "옥상 포탑", "저격 로봇"], missions: ["시민 구조", "건물 사이 추격", "옥상 송신기 파괴"] },
  river: { name: "강변", foes: ["고속정", "드론 떼"], missions: ["다리 방어", "수송선 호위"] },
  base: { name: "기지", foes: ["전투기 편대", "대공 로봇"], missions: ["활주로 방어", "격납고 탈환"] },
  heritage: { name: "유적", foes: ["정찰 드론", "저격 로봇"], missions: ["문화재 보호", "잠입 정찰"] },
  arena: { name: "경기장", foes: ["레이싱 드론", "드론 떼"], missions: ["경기장 탈환", "추격"] },
  rural: { name: "들판", foes: ["전차", "정찰 드론"], missions: ["마을 피난 호위", "보급 회수"] },
  front: { name: "전선", foes: ["전차", "포탑", "구형 드론"], missions: ["참호 돌파", "포대 제압"] },
  port: { name: "항구", foes: ["구축함", "고속정", "대함 포대"], missions: ["함대 호위", "구축함 격침", "부두 탈환"] },
  coast: { name: "해안", foes: ["해안 포대", "고속정"], missions: ["포대 제압", "상륙 엄호"] },
  sea: { name: "바다", foes: ["구축함", "고속정", "잠수 드론"], missions: ["수상 정찰", "조난자 구조"] },
  fort: { name: "요새", foes: ["포탑", "방패 로봇", "대공 로봇"], missions: ["공성", "성문 돌파"] },
  snow: { name: "설원", foes: ["설상 전차", "저공 침투기"], missions: ["저공 침투", "조난자 구조"] },
  mountain: { name: "산악", foes: ["저공 침투기", "산악 포대"], missions: ["능선 저공 돌파", "관측소 파괴"] },
  glacier: { name: "빙하", foes: ["설상 전차", "거대 로봇"], missions: ["빙하 계곡 돌파", "보급 열차 저지"] },
  radar: { name: "통신", foes: ["전파 교란기", "드론 떼"], missions: ["송신탑 파괴", "전파 교란", "데이터 회수"] },
  canyon: { name: "협곡", foes: ["매복 포탑", "중장갑 로봇"], missions: ["협곡 매복 돌파", "댐 방어"] },
  mesa: { name: "고원", foes: ["미사일 전차", "포탑"], missions: ["고원 포대 제압", "정찰"] },
  mine: { name: "광산", foes: ["중장갑 로봇", "드론 떼"], missions: ["광부 구조", "갱구 봉쇄"] },
  volcano: { name: "화산", foes: ["정찰 드론", "구축함"], missions: ["지열 발전소 방어", "분화구 정찰"] },
  ruin: { name: "폐허", foes: ["포탑", "구형 드론", "전차"], missions: ["시민 구조", "점령지 해방"] },
  lab: { name: "연구소", foes: ["대공 로봇", "경비 드론"], missions: ["데이터 회수", "잠입"] },
  wasteland: { name: "황무지", foes: ["미사일 전차", "전차 부대"], missions: ["전차 부대 섬멸", "보급로 차단"] },
  factory: { name: "공창", foes: ["미사일 전차", "거대 로봇", "방패 로봇"], missions: ["생산 라인 파괴", "굴뚝 폭파"] },
  launch: { name: "발사장", foes: ["대공 로봇", "구축함"], missions: ["로켓 발사 저지", "관제탑 파괴"] },
  heart: { name: "심장부", foes: ["에이스 편대", "공중 요새", "초거대 로봇"], missions: ["심장 코어 공격", "에이스 격추"] },
  monolith: { name: "모노리스", foes: ["에이스 편대", "경비 드론"], missions: ["모노리스 사이 추격", "송신 첨탑 파괴"] },
  flagship: { name: "기함 정박지", foes: ["기함", "구축함", "에이스 편대"], missions: ["기함 격침", "출항 저지"] },
};

const Z = (region, id, name, sx, sy, r, theme, use, map = null) => ({ id, region, name, p: toW(sx, sy), r, theme, use, map });
export const ZONES = [
  // ── 한울 공화국 ──
  Z("hanul", "hanul_parl", "의사당 광장", 335, 315, 160, "city", "연합 의회와 비행단 사령부가 있는 수도 한복판"),
  Z("hanul", "hanul_bridge", "강변 다리목", 344, 370, 110, "river", "수도 남쪽, 북설에서 내려온 강을 건너는 다리들"),
  Z("hanul", "hanul_neon", "네온 마천루 숲", 415, 305, 230, "city", "전선에 가장 가까운 대도시. 네온 고층 숲", "city"),
  Z("hanul", "hanul_airbase", "비행기지 활주로", 255, 280, 240, "base", "은빛 편대의 본거지. 활주로 둘과 격납고", "airbase"),
  Z("hanul", "hanul_palace", "단풍 고궁 성곽", 295, 395, 170, "heritage", "옛 왕조의 궁성과 단풍 숲", "palace"),
  Z("hanul", "hanul_stadium", "드론 리그 스타디움", 380, 395, 150, "arena", "연합 파일럿을 길러 내는 드론 경기장", "stadium"),
  Z("hanul", "hanul_farm", "서부 풍차 들판 마을", 250, 350, 220, "rural", "밭과 풍차, 작은 마을이 이어진 곡창"),
  Z("hanul", "hanul_front", "동부 전선 참호선", 478, 330, 260, "front", "제국 1세대 땅과 맞닿은 참호선"),
  // ── 해림 해양국 ──
  Z("haerim", "haerim_dock", "조선 독", 98, 318, 120, "port", "연합 수송함과 시제기를 만드는 조선소", "factory"),
  Z("haerim", "haerim_yard", "컨테이너 부두", 110, 334, 120, "port", "부품과 고철이 모이는 화물 부두", "factory"),
  Z("haerim", "haerim_navy", "군항 전함 부두", 166, 413, 200, "port", "연합 함대 모항. 전함이 정박한 부두"),
  Z("haerim", "haerim_light", "등대곶 해안 포대", 96, 262, 160, "coast", "서해 바닷길을 지키는 등대와 해안포"),
  Z("haerim", "haerim_hills", "해안 구릉 마을", 165, 300, 220, "rural", "바다를 내려다보는 구릉과 어촌"),
  Z("haerim", "haerim_delta", "강 하구 삼각주", 122, 370, 160, "river", "한울에서 흘러온 강이 바다로 드는 하구"),
  Z("haerim", "haerim_sea", "서해 외해", 40, 330, 300, "sea", "함대가 오가는 넓은 서해"),
  // ── 북설 연방 ──
  Z("bukseol", "buk_seori", "서리성 얼음 성곽", 165, 190, 200, "fort", "북설 수도. 얼음 협곡 위의 성곽"),
  Z("bukseol", "buk_village", "성 밖 마을", 195, 218, 150, "snow", "성곽 남쪽 눈 덮인 마을"),
  Z("bukseol", "buk_gondola", "설국 산장 곤돌라", 255, 150, 210, "snow", "스키장과 곤돌라가 있는 산악 마을", "snow"),
  Z("bukseol", "buk_ridge", "북방 설산 능선", 330, 95, 320, "mountain", "대륙에서 가장 높은 설산 능선"),
  Z("bukseol", "buk_radar", "통신기지 레이더 밭", 430, 163, 140, "radar", "에이아 신호를 잡은 거대 레이더 접시", "frost"),
  Z("bukseol", "buk_strip", "통신기지 활주로", 436, 190, 130, "base", "통신기지 보급 활주로", "frost"),
  Z("bukseol", "buk_baek", "백령 요새 산마루", 476, 108, 190, "fort", "제국 땅과 맞닿은 북쪽 산악 요새"),
  Z("bukseol", "buk_glacier", "빙하 발원 계곡", 462, 228, 170, "glacier", "한울로 흐르는 강이 시작되는 빙하 계곡"),
  // ── 적사 자치령 ──
  Z("jeoksa", "jeok_terrace", "광산 계단 지구", 215, 452, 180, "mine", "절벽을 깎아 만든 계단식 광산 도시"),
  Z("jeoksa", "jeok_shaft", "갱구와 폐석 언덕", 190, 472, 150, "mine", "갱구 탑과 폐석 더미"),
  Z("jeoksa", "jeok_dam", "협곡 댐", 334, 488, 120, "canyon", "협곡 강을 막은 댐과 수문", "canyon"),
  Z("jeoksa", "jeok_needle", "협곡 바늘길", 285, 494, 160, "canyon", "좁고 깊은 협곡 저공 구간", "canyon"),
  Z("jeoksa", "jeok_mesa", "붉은 메사 고원", 330, 445, 260, "mesa", "계단처럼 깎인 붉은 사암 고원"),
  Z("jeoksa", "jeok_wind", "풍력 단지 마을", 352, 508, 140, "rural", "댐 아래 풍력 발전기와 협곡 마을"),
  Z("jeoksa", "jeok_outpost", "제국 전초기지", 425, 485, 200, "fort", "제국이 협곡에 박아 넣은 2세대 전진기지", "outpost"),
  Z("jeoksa", "jeok_mouth", "협곡 하구", 210, 540, 160, "river", "협곡 강이 남해로 나가는 하구"),
  // ── 남도 군도 왕국 ──
  Z("namdo", "nam_crater", "화산 분화구", 300, 605, 80, "volcano", "용암이 끓는 분화구", "island"),
  Z("namdo", "nam_geo", "지열 발전소", 282, 612, 110, "volcano", "연합에 전기를 보내는 지열 발전소와 냉각탑", "island"),
  Z("namdo", "nam_bungalow", "수상 방갈로 해변", 334, 616, 90, "coast", "얕은 바다 위 수상 방갈로", "island"),
  Z("namdo", "nam_port", "산호항 부두", 378, 630, 130, "port", "수상기와 경비정의 부두"),
  Z("namdo", "nam_village", "산호항 흰 마을", 368, 616, 110, "rural", "남도 왕국 수도의 흰 마을"),
  Z("namdo", "nam_isle", "서쪽 작은 섬", 236, 588, 150, "coast", "등대 하나가 선 작은 섬"),
  Z("namdo", "nam_sea", "남해 외해", 330, 655, 300, "sea", "궤도 발사기지로 이어지는 남해"),
  // ── 제국 1세대 점령지 ──
  Z("e1", "e1_noman", "전선 무인지대", 512, 258, 260, "front", "포탄 구덩이와 철조망의 무인지대"),
  Z("e1", "e1_ruins", "관문시 폐허 중심가", 548, 182, 180, "ruin", "제국에 넘어간 옛 인간 도시의 폐허"),
  Z("e1", "e1_gate", "관문시 성벽 검문소", 548, 213, 100, "fort", "점령 도시를 두른 콘크리트 성벽과 검문소"),
  Z("e1", "e1_tanks", "코어 탱크 지대", 532, 330, 140, "fort", "에너지 코어를 저장한 거대 탱크", "vault"),
  Z("e1", "e1_outer", "저장고 외곽", 552, 360, 150, "fort", "저장고 남쪽 경비 막사와 포대", "vault"),
  Z("e1", "e1_lab", "방위청 연구동", 522, 462, 120, "lab", "EIA가 처음 눈뜬 연구소"),
  Z("e1", "e1_dish", "위성 접시 언덕", 508, 454, 110, "radar", "옛 방위청 위성 통신 접시"),
  Z("e1", "e1_graveyard", "남부 전차 묘지", 532, 512, 180, "wasteland", "부서진 전차가 널린 남쪽 벌판"),
  // ── 제국 2세대 공창 지대 ──
  Z("e2", "e2_foundry", "거신 조립동", 680, 132, 220, "factory", "거신을 조립하는 거대 공장", "foundry"),
  Z("e2", "e2_glacier", "빙하 골짜기", 648, 98, 240, "glacier", "공창을 둘러싼 빙하 골짜기"),
  Z("e2", "e2_wall_n", "강철 방벽 북단", 619, 200, 180, "fort", "2세대 땅을 남북으로 가르는 방벽의 북쪽"),
  Z("e2", "e2_wall_gate", "강철 방벽 관문", 622, 300, 150, "fort", "방벽 가운데 관문과 벙커"),
  Z("e2", "e2_armory", "조병창 공장가", 682, 418, 220, "factory", "전차와 로봇을 찍어 내는 공장 도시"),
  Z("e2", "e2_slag", "슬래그 황무지", 702, 300, 300, "wasteland", "검은 쇳물 찌꺼기가 쌓인 황무지"),
  Z("e2", "e2_pads", "궤도 발사대", 632, 482, 150, "launch", "달로 가는 로켓 발사대", "spaceport"),
  Z("e2", "e2_harbor", "발사기지 함대 항만", 632, 515, 170, "port", "제국 남해 함대의 항만", "spaceport"),
  // ── 제국 3세대 심장부 ──
  Z("e3", "e3_heart", "심장 첨탑", 842, 278, 120, "heart", "에이아의 심장. 붉게 뛰는 첨탑", "empire"),
  Z("e3", "e3_forest", "모노리스 숲", 842, 278, 330, "monolith", "검은 모노리스가 숲처럼 선 수도", "empire"),
  Z("e3", "e3_citadel", "모노리스 요새", 800, 172, 200, "fort", "문이 없는 검은 성채"),
  Z("e3", "e3_veins", "심장맥 평원", 790, 380, 300, "monolith", "붉은 심장맥이 땅을 가르는 평원"),
  Z("e3", "e3_flagship", "기함 부두", 845, 470, 200, "flagship", "제국 기함과 항모의 정박지"),
  Z("e3", "e3_outer", "수도 외곽 방어선", 770, 270, 200, "front", "수도를 두른 3세대 방어선"),
  Z("e3", "e3_cliff", "동해 절벽", 885, 230, 200, "coast", "수도 동쪽 바다 절벽"),
];
export const ZONE = Object.fromEntries(ZONES.map((z) => [z.id, z]));

// 대륙 좌표의 구역: 반경 안에서 (거리/반경)이 가장 작은 곳
export function zoneAt(X, Z_) {
  let best = null, bs = 1;
  for (const z of ZONES) { const s = Math.hypot(X - z.p[0], Z_ - z.p[1]) / z.r; if (s < bs) { bs = s; best = z; } }
  return best;
}
