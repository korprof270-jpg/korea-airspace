// 인연 이야기(호감도 개별 이야기)와 엔딩 기록
//  인물마다 2~3편. 관계 수치(hsrel:) 와 본편 진행(장 완료)으로 열린다. 마지막 편은 그 인물이 윙맨으로 함께 나는 전용 임무
//  기록: hsbond:<편 id> 완료 · hsseen:<편 id> 장면 봄 · hs:<편 id> 임무 별 · hsbondfin:<인물> 마지막 편 완결 · hsending:<엔딩> 수집
import { records, save } from "./config.js";
import { MAPS } from "./maps/index.js";
import { rel, flag, BONDS } from "./vn.js";
import { story, chapterDone, stageConfig, objectivesOf, goalText } from "./story.js";
import { SCENES } from "./scenes.js";

// 단계 정의를 짧게: 임무 = { kind, map, title, talk(브리핑 한두 줄), o: stage 옵션(obj 3~4개·wing·team …) }
const M = (kind, map, title, talk, o) => ({ kind, map, title, talk, o });

export const BOND_DEFS = {
  서하린: { key: "harin", eps: [
    { title: "지붕 위의 내기", need: 3, after: "c3", desc: "작전 없는 밤, 격납고 지붕에서 별을 세는 편대장." },
    { title: "돌아오라는 말", need: 7, after: "c6", desc: "3년 전 편대가 떨어진 협곡에 구조 비컨을 세운다.",
      mission: M("waves", "canyon", "돌아오라는 말", ["서하린|비컨을 박는 동안 지켜 줘. 이번엔 늦지 않는다."],
        { team: 1, wing: ["서하린"], power: 1.05, boss: { name: "제국 순찰 지휘기 ‘매’", kind: "gunship", unit: "frigate", at: 55, hp: 0.9 },
          obj: [{ t: "win", req: true }, { t: "core", n: 60 }, { t: "crash", n: 1 }, { t: "boss" }] }) },
  ] },
  바우: { key: "bau", eps: [
    { title: "라면 한 그릇의 값", need: 3, after: "c3", desc: "자정의 휴게실, 봉투 여러 장과 너무 짠 라면." },
    { title: "곰 형의 배달", need: 7, after: "c6", desc: "첫눈 내린 날, 해바라기 고아원 돔의 불이 꺼져 간다.",
      mission: M("escort", "city", "곰 형의 배달", ["바우|트럭이 끝까지 가는 게 핵심이다! 저 끝에 우리 꼬맹이들이 있어!"],
        { team: 1, wing: ["바우"], power: 1.0, boss: { name: "제국 약탈선 ‘까마귀떼’", kind: "gunship", unit: "frigate", at: 50, hp: 0.8 },
          obj: [{ t: "win", req: true }, { t: "truck", n: 70 }, { t: "crash", n: 1 }, { t: "kills", n: 6 }] }) },
  ] },
  유리: { key: "yuri", eps: [
    { title: "틀린 음", need: 3, after: "c4", desc: "한밤의 통신실. 제국의 행진곡 속에 숨은 0.02초의 엇박." },
    { title: "잘 자, 라는 신호", need: 7, after: "c6", desc: "엇박의 정체는 궁궐 방송탑에 남은 오래된 목소리였다.",
      mission: M("heist", "palace", "잘 자, 라는 신호", ["유리|진지 두 곳에 음성 기록 코어가 있어요. 하나도 못 버려요."],
        { team: 1, wing: ["유리"], power: 1.0, obj: [{ t: "win", req: true }, { t: "time", n: 80 }, { t: "crash", n: 1 }, { t: "hp", n: 40 }] }) },
  ] },
  차도윤: { key: "doyun", eps: [
    { title: "반성문 세 장", need: 3, after: "c5", desc: "새벽 세 시의 시뮬레이터실. 잠들지 못한 백야의 주인." },
    { title: "흑야", need: 7, after: "c7", desc: "제국이 포로의 비행 기록으로 만든 검은 백야가 경기장에 나타났다.",
      mission: M("boss", "arena", "흑야", ["차도윤|저건 예전의 나야. 혼자, 늘 맨 앞. ……같이 부순다."],
        { team: 1, wing: ["차도윤"], power: 1.1, boss: { name: "복제 지휘기 ‘흑야’", kind: "boss" },
          obj: [{ t: "win", req: true }, { t: "crash", n: 1 }, { t: "kills", n: 6 }, { t: "hp", n: 40 }] }) },
  ] },
  모아: { key: "moa", eps: [
    { title: "고칠 수 없는 서랍", need: 2, after: "c2", desc: "정비창 구석, 모아가 절대 버리지 않는 서랍 하나." },
    { title: "고철의 무덤", need: 4, after: "c7", desc: "노을이 실려 갈 뻔했던 폐기장을 제국이 차지했다.",
      mission: M("strike", "factory", "고철의 무덤", ["모아|포탑이랑 지휘소 다 부숴! 폐기장은 우리 거야!"],
        { team: 1, wing: ["모아"], power: 1.0, obj: [{ t: "win", req: true }, { t: "time", n: 75 }, { t: "crash", n: 1 }, { t: "kills", n: 6 }] }) },
  ] },
  노을: { key: "noeul", eps: [
    { title: "처음 들은 목소리", need: 3, after: "c2", desc: "아무도 없는 격납고. 기체가 처음으로 질문을 한다." },
    { title: "잠긴 기억", need: 7, after: "c5", desc: "정비 중, 봉인된 회로 너머로 불빛과 연기가 새어 나온다." },
    { title: "노을의 언덕", need: 11, after: "c7", desc: "모아가 만든 예비 기체. 노을이 처음으로 네 옆에서 난다.",
      mission: M("waves", "island", "노을의 언덕", ["노을|이번엔 네 안에서 말고, 네 옆에서 지킬게."],
        { team: 1, wing: ["노을"], power: 1.15, boss: { name: "제국 강습 거대로봇 ‘해일’", kind: "boss", unit: "mech", at: 60, hp: 0.7 },
          obj: [{ t: "win", req: true }, { t: "core", n: 55 }, { t: "crash", n: 1 }, { t: "boss" }] }) },
  ] },
  윤채아: { key: "chaea", eps: [
    { title: "무전을 끄면", need: 1, after: "c3", desc: "근무가 끝난 관제실. 등대의 목소리가 사람의 목소리로 돌아온다." },
    { title: "등대의 첫 비행", need: 3, after: "c7", desc: "끊긴 중계소로 보급을 나른다. 이번엔 채아가 조종간을 잡는다.",
      mission: M("supply", "canyon", "등대의 첫 비행", ["윤채아|저, 저 진짜 날아요? ……네. 날아요. 가요."],
        { team: 1, wing: ["윤채아"], power: 0.95, obj: [{ t: "win", req: true }, { t: "time", n: 80 }, { t: "crash", n: 1 }, { t: "hp", n: 50 }] }) },
  ] },
  진세라: { key: "sera", eps: [
    { title: "계산서", need: 2, after: "c4", desc: "새벽 두 시의 작전실. 진세라의 수첩에는 숫자 대신 이름이 있다." },
    { title: "지워진 사본", need: 4, after: "c7", desc: "제국 중계기지에 남은, 아무도 모르는 보고서의 사본.",
      mission: M("heist", "island", "지워진 사본", ["진세라|기록 코어 두 개. 계산으로는 하나면 충분합니다. ……둘 다 가져와 주세요."],
        { team: 1, wing: ["진세라"], power: 1.05, obj: [{ t: "win", req: true }, { t: "time", n: 75 }, { t: "crash", n: 0 }, { t: "hp", n: 35 }] }) },
  ] },
  한별: { key: "byeol", eps: [
    { title: "무서운 거랑 가는 거랑", need: 2, after: "c3", desc: "의무실의 소독약 냄새. 한별이 기억하지 못하는 세 살의 밤." },
    { title: "눈 속의 구급상자", need: 4, after: "c6", desc: "눈보라에 갇힌 대피소들. 곰 오빠 없이 나는 첫 구조 비행.",
      mission: M("supply", "snow", "눈 속의 구급상자", ["한별|약 상자 네 개, 대피소 네 곳. 하나도 안 늦어요."],
        { team: 1, wing: ["한별"], power: 0.95, obj: [{ t: "win", req: true }, { t: "time", n: 85 }, { t: "crash", n: 0 }, { t: "hp", n: 45 }] }) },
  ] },
  루카: { key: "luka", eps: [
    { title: "광대의 분장", need: 2, after: "c5", desc: "카메라가 꺼진 뒤의 대기실. 웃음을 지운 청동의 에이스." },
    { title: "쇼는 계속된다", need: 4, after: "c7", desc: "피난민을 위한 에어쇼에 제국이 쳐들어왔다. 이번엔 혼자 앞에 서지 않는다.",
      mission: M("waves", "arena", "쇼는 계속된다", ["루카|관객석 방어막이 핵심이야. 오늘 쇼의 주인공은 관객이니까."],
        { team: 1, wing: ["루카"], power: 1.1, boss: { name: "제국 돌격 전투함 ‘훼방꾼’", kind: "gunship", unit: "frigate", at: 50, hp: 1.0 },
          obj: [{ t: "win", req: true }, { t: "core", n: 60 }, { t: "kills", n: 10 }, { t: "boss" }] }) },
  ] },
};

// ── 편 목록 (id = b-<인물키>-<번호>) ──
let cache = null;
export function episodes() {
  if (cache) return cache;
  const out = [];
  for (const [name, d] of Object.entries(BOND_DEFS)) d.eps.forEach((e, i) => {
    const ep = Object.assign({}, e, { id: `b-${d.key}-${i + 1}`, who: name, no: i + 1, last: i === d.eps.length - 1 });
    if (e.mission && MAPS[e.mission.map]) ep.stage = mkStage(ep);
    out.push(ep);
  });
  return (cache = out);
}
export const epsOf = (name) => episodes().filter((e) => e.who === name);
export const epById = (id) => episodes().find((e) => e.id === id) || null;

// 임무 편 → 스토리 단계와 같은 모양 (stageConfig·objectivesOf 를 그대로 쓴다)
function mkStage(ep) {
  const m = ep.mission, chi = Math.max(0, ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"].indexOf(ep.after));
  const chapter = { id: "bond", map: m.map, title: `인연 · ${ep.who}`, en: "BOND", no: chi + 2, hidden: 0, faction: null };
  return { id: ep.id, kind: m.kind, title: m.title, talk: m.talk, brief: m.talk.map((l) => l.split("|").pop()).join(" "), o: m.o, boss: m.o.boss || null, after: null, chapter, route: null, no: ep.no, bond: ep };
}

// ── 해금 조건 ──
const chapterById = (id) => story().chapters.find((c) => c.id === id);
export const progressOk = (ep) => { const c = chapterById(ep.after); return !c || chapterDone(c); };
export const relOk = (ep) => rel(ep.who) >= ep.need;
export const prevOk = (ep) => ep.no === 1 || epDone(epsOf(ep.who)[ep.no - 2]);
export const epOpen = (ep) => progressOk(ep) && relOk(ep) && prevOk(ep);
export const epDone = (ep) => !!(ep && records[`hsbond:${ep.id}`]);
export const epSeen = (ep) => !!records[`hsseen:${ep.id}`];
export const epStars = (ep) => records[`hs:${ep.id}`] || 0;
export function hintOf(ep) {
  const c = chapterById(ep.after), out = [];
  if (!prevOk(ep)) out.push([false, `${ep.no - 1}편 「${epsOf(ep.who)[ep.no - 2].title}」 먼저`]);
  out.push([relOk(ep), `${ep.who}와(과)의 관계 ${ep.need} 이상 (지금 ${rel(ep.who)})`]);
  if (c) out.push([progressOk(ep), `본편 ${c.no}장 「${c.title}」 완료`]);
  return out;
}
export const bondScene = (ep, part = "pre") => (SCENES[ep.id] && SCENES[ep.id][part]) || null;
export const newCount = () => episodes().filter((e) => epOpen(e) && !epDone(e)).length;

// 이야기만 있는 편: 장면을 끝까지 보면 완료
export function markEpisode(ep) {
  records[`hsseen:${ep.id}`] = 1;
  if (!ep.stage) finish(ep);
  save();
}
function finish(ep) {
  records[`hsbond:${ep.id}`] = 1;
  if (ep.last) records[`hsbondfin:${ep.who}`] = 1;
}

// 임무 편 출격 설정
export function bondConfig(ep) {
  const st = ep.stage, cfg = stageConfig(st, st.o.team);
  cfg.title = `인연 · ${ep.who} · ${st.title}`;
  cfg.bond = ep.id;
  return cfg;
}
// 결과 판정 (main.js → result.story). 결과 화면은 스토리 단계와 같은 모양을 쓴다
export function completeBond(id, result) {
  const ep = epById(id);
  if (!ep || !ep.stage) return null;
  const st = ep.stage, ev = result.obj;
  const passed = ev ? ev.passed : result.win !== false, stars = ev ? ev.stars : result.win === false ? 0 : 2;
  const info = { stage: st, bond: ep, passed, goal: goalText(st), obj: ev || null, next: null, first: false, done: false, after: null, choose: false, post: false };
  if (passed) {
    info.first = !epDone(ep);
    if (stars > epStars(ep)) records[`hs:${ep.id}`] = Math.max(1, stars);
    finish(ep);
    save();
    info.post = !!bondScene(ep, "post");
  }
  return info;
}
export { objectivesOf };

// ── 엔딩 ──
export const FINALE = "c8-4";   // 이 단계의 임무 뒤 장면이 엔딩으로 갈린다
// 진 엔딩: 노을과의 관계 10 이상 + 노을과 나눈 결정적 순간 3개 중 2개 + 인연 이야기 3명 이상 완결
// 씁쓸한 엔딩: 노을과의 관계 5 미만, 또는 편대 전체와의 관계 합 15 미만
export const ENDINGS = [
  { id: "true", no: 1, kind: "TRUE END", title: "새벽의 날개", desc: "모두의 목소리가 닿은 하늘. 노을도, 에이아가 잊었던 첫 명령도 함께 돌아온다.",
    hint: "노을과 깊은 관계를 쌓고, 노을과의 결정적인 순간을 지나며, 동료들의 인연 이야기를 끝까지 함께하면……" },
  { id: "normal", no: 2, kind: "NORMAL END", title: "노을이 지는 하늘", desc: "거신은 무너지고 돔은 지켜졌다. 노을은 기억을 되찾고 돌아왔다.", hint: "본편을 끝까지 마치면 도달합니다." },
  { id: "bitter", no: 3, kind: "BITTER END", title: "남겨진 불빛", desc: "하늘은 지켰지만, 노을은 모든 기억을 연료로 태웠다. 말없는 표시등만 남았다.",
    hint: "노을과 거리를 둔 채 마지막 비행에 오르면……" },
];
export const KEY_FLAGS = ["toldPast", "noeulChose", "yeomyeongJoin"];
export const finCount = () => BONDS.filter((n) => records[`hsbondfin:${n}`]).length;
export const teamBond = () => BONDS.filter((n) => n !== "노을").reduce((s, n) => s + Math.max(0, rel(n)), 0);
export function endingStatus() {
  const keys = KEY_FLAGS.filter(flag).length;
  return { noeul: rel("노을"), keys, fin: finCount(), team: teamBond(),
    trueOk: rel("노을") >= 10 && keys >= 2 && finCount() >= 3,
    bitter: rel("노을") < 5 || teamBond() < 15 };
}
export function endingOf() {
  const s = endingStatus();
  return s.trueOk ? "true" : s.bitter ? "bitter" : "normal";
}
export const endingGot = (id) => !!records[`hsending:${id}`];
export const endingsGot = () => ENDINGS.filter((e) => endingGot(e.id));
export function recordEnding(id) {
  const first = !endingGot(id);
  records[`hsending:${id}`] = 1; records.hsendlast = id; save();
  return first;
}
