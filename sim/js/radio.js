// 동적 무전: 스토리 무전(cfg.radio 의 정해진 시각 대사)과 같은 패널에, 전투 상황에 따라 동료가 즉석으로 한 줄씩 말한다
//  session.radioSay(who, line, { prio = 1, ttl = 6, force = false }) → 대기열에 넣는다 (true = 넣음)
//    · 한 번에 한 줄, 4.5초씩. 줄 사이 최소 간격 GAP 초(force 면 무시) · 정해진 스토리 무전이 나오는 동안은 기다린다
//    · ttl 초 안에 못 띄우면 버린다(지난 상황의 말은 하지 않는다) · prio 가 높은 줄이 먼저
//  Chatter: 전투 사건(빈사·연속 격파·보스 격파·아군 함선 피격·임무 막바지 등)을 보고 동료 대사를 고른다
import { CAST } from "./story.js";

const SHOW = 4.5, GAP = 8;

// 무전 대사 녹음(ElevenLabs): audio/voice/index.json = { "대사 원문": "파일 이름" }. 없으면 글자만 띄운다
let VOICES = null;
fetch("audio/voice/index.json").then((r) => (r.ok ? r.json() : null)).then((j) => { VOICES = j; }).catch(() => { /* 녹음 없음 */ });

export function installRadio(s) {
  if (s.radioSay) return s.radioSay;
  const Q = (s._radioQ = []);
  let cur = null, lastEnd = -99, clock = 0;
  const base = s._radio;                      // 원래 그리기 (Session.prototype._radio)
  const scripted = (t, pad = 0) => { const R = s.cfg.radio; return !!(R && R.some(([at]) => t >= at - pad && t < at + SHOW + 0.6)); };
  s.radioSay = (who, line, o = {}) => {
    if (!who || !line || s.cfg.net) return false;
    if (Q.length >= 4) { if (!(o.prio > Math.min(...Q.map((q) => q.prio)))) return false; Q.splice(Q.indexOf(Q.reduce((a, b) => (b.prio < a.prio ? b : a))), 1); }
    Q.push({ who, line, prio: o.prio ?? 1, until: clock + (o.ttl ?? 6), force: !!o.force });
    Q.sort((a, b) => b.prio - a.prio);
    return true;
  };
  s.radioBusy = () => !!cur || scripted(s.mode.time, 1.5);
  // 무전 한 줄이 끝난 뒤 지난 시간 (Chatter 의 간격 판단용)
  s.radioIdle = () => (cur ? 0 : clock - lastEnd);
  s._radioTick = (dt) => {
    const m = s.mode;
    if (!m || m.state !== "run" || m.cut) return;
    clock += dt;
    if (cur && clock >= cur.end) { cur = null; lastEnd = clock; }
    for (let i = Q.length - 1; i >= 0; i--) if (Q[i].until < clock) Q.splice(i, 1);
    if (cur || !Q.length || scripted(m.time, 1)) return;
    if (!Q[0].force && clock - lastEnd < GAP) return;
    const q = Q.shift();
    cur = { who: q.who, line: q.line, start: clock, end: clock + SHOW };
    const vf = VOICES && VOICES[q.line];
    if (vf && s.game && s.game.sound && s.game.sound.playVoiceClip) s.game.sound.playVoiceClip(`audio/voice/${vf}`);
  };
  // 그리기: 정해진 무전이 있으면 그대로, 없으면 동적 줄을 같은 패널 모양으로 (원래 함수에 한 줄짜리 목록을 잠깐 넘긴다)
  s._radio = function (h) {
    const m = this.mode;
    if (!cur || !m || scripted(m.time)) return base.call(this, h);
    const R = this.cfg.radio;
    this.cfg.radio = [[m.time - (clock - cur.start), cur.who, cur.line]];
    try { base.call(this, h); } finally { this.cfg.radio = R; }
  };
  return s.radioSay;
}

// ── 대사 ──
// 사건별: 인물 이름 → 대사 목록, "*" 는 누구나
const LINES = {
  lowhp: {
    "*": ["기체 손상이 심해! 잠깐 빠져!", "체력 위험! 수리 키트 찾아!", "엄호할게, 일단 물러나!"],
    "서하린": ["무리하지 마. 내가 앞을 맡을게.", "체력 위험해. 엄폐하고 숨 돌려."],
    "바우": ["야, 너덜너덜하잖아! 내 뒤로 와!", "버텨! 곰이 막아 줄게!"],
    "유리": ["기체 신호 불안정해요… 조심하세요!", "손상률 70% 넘었어요!"],
    "모아": ["내 기체 망가뜨리면 혼난다! 빠져!", "장갑이 종잇장이야! 수리부터!"],
    "차도윤": ["그 꼴로 싸우겠다고? 물러나.", "뒤는 내가 본다. 정비나 해."],
    "윤채아": ["등대에서 알림. 기체 손상 위험 수준.", "체력 경고. 회복을 우선하세요."],
    "한별": ["다쳤어요? 수리 신호 보내 둘게요!", "체력 낮아요! 무리하면 안 돼요!"],
    "루카": ["이봐, 피 흘리는 새는 오래 못 날아.", "엄호한다. 빠져!"],
  },
  streak: {
    "*": ["연속 격파! 대단한데!", "그 기세 그대로!", "하늘이 네 거다!"],
    "서하린": ["좋아, 그 리듬 유지해.", "훌륭해. 편대가 산다."],
    "바우": ["와, 혼자 다 먹을 셈이야?!", "하하! 나도 끼워 줘!"],
    "유리": ["격추 기록 갱신 중이에요!", "와… 진짜 빠르다…"],
    "차도윤": ["…제법이군. 인정하지.", "흥, 나도 질 수 없지."],
    "윤채아": ["연속 격파 확인. 좋은 비행이에요.", "적 편대 붕괴 중!"],
    "루카": ["청동 편대에 들어와라, 진심이야.", "멋진 사냥이다!"],
    "한별": ["와아, 멋져요!", "다들 봤어요? 연속 격파!"],
  },
  boss: {
    "*": ["해냈다! 거대 표적 격파!", "쓰러졌어! 대단해!"],
    "서하린": ["보스 격파 확인. 잘했어.", "해냈네. …역시 믿길 잘했어."],
    "바우": ["우오오! 저 덩치를 잡았어!", "봤냐 제국 놈들아!"],
    "유리": ["적 지휘 신호 소멸! 해냈어요!", "보스 반응 없음… 이겼어요!"],
    "모아": ["와! 저거 부품 챙겨 와!", "노을이 해냈어!"],
    "차도윤": ["…좋은 사격이었다.", "이번엔 네 공이다."],
    "윤채아": ["대형 표적 격파 확인!", "보스 반응 소멸. 수고했어요."],
    "루카": ["거인이 쓰러졌다!", "기록에 남겠군."],
    "한별": ["다친 사람 없죠? 해냈어요!"],
  },
  phase2: {
    "*": ["놈이 미쳐 날뛴다! 조심해!", "공격이 빨라졌어! 회피 준비!"],
    "서하린": ["패턴이 바뀌었어. 회피 우선!", "놈이 발악한다. 침착하게."],
    "바우": ["화났나 본데? 더 세게 때려!", "덤벼 봐, 깡통!"],
    "유리": ["출력이 급상승해요! 피하세요!", "에너지 반응 두 배예요!"],
    "차도윤": ["이제야 진심이군. 따라와.", "발악이다. 끝내자."],
    "윤채아": ["표적 출력 상승! 2단계 공격 패턴!"],
    "루카": ["거인이 이를 드러냈다!"],
  },
  shiphit: {
    "*": ["아군 함선이 맞고 있어! 엄호해!", "함선 피격! 적부터 떨어뜨려!"],
    "서하린": ["함선 쪽으로 붙어! 지금!", "수송함부터 지켜!"],
    "바우": ["함선 건드리는 놈 누구야!", "내가 몸으로 막는다!"],
    "유리": ["함선 장갑 수치 떨어져요!", "선체에 연속 피격이에요!"],
    "윤채아": ["함선 피격 보고! 엄호 요청!", "선체 손상 증가 중!"],
    "한별": ["함선 안에 사람들이 있어요! 지켜 줘요!"],
  },
  corehit: {
    "*": ["코어가 공격받고 있어!", "기지로 돌아와! 코어 위험!"],
    "서하린": ["코어 쪽 막아! 우선순위 변경!"],
    "바우": ["기지에 붙은 놈들 떼어 내자!"],
    "유리": ["코어 내구도 떨어져요!"],
    "윤채아": ["코어 피격! 방어선으로 복귀!"],
  },
  nearend: {
    "*": ["거의 다 왔어! 조금만 더!", "마지막이야! 힘내!"],
    "서하린": ["마무리하자. 끝까지 집중.", "조금만 더. 같이 돌아가자."],
    "바우": ["끝이 보인다! 밀어붙여!", "마지막 한 판이다!"],
    "유리": ["임무 완료까지 얼마 안 남았어요!"],
    "모아": ["거의 다 왔어! 돌아오면 정비해 줄게!"],
    "차도윤": ["끝내자. 늘어지지 마."],
    "윤채아": ["임무 종료 임박. 마지막까지 집중!", "목표까지 얼마 안 남았어요!"],
    "루카": ["마지막 직선 구간이다!"],
    "한별": ["다들 조금만 더 버텨요!"],
  },
  died: {
    "*": ["괜찮아?! 재출격해!", "추락했어! 다시 올라와!"],
    "서하린": ["괜찮아, 다시 와. 기다릴게.", "숨 고르고 재출격해."],
    "바우": ["야! 일어나! 아직 안 끝났어!"],
    "유리": ["신호 끊겼… 아, 재출격 중이에요!"],
    "모아": ["으악, 내 기체!! 빨리 다시 띄워!"],
    "차도윤": ["벌써 떨어졌나. 빨리 돌아와."],
    "한별": ["파일럿 무사해요! 재출격 준비!"],
  },
  wingdown: {
    "*": ["윙맨 추락! 빈자리 메워!", "동료가 격추됐어!"],
    "서하린": ["편대 하나 잃었어. 대형 유지!"],
    "윤채아": ["아군기 추락. 곧 재출격합니다."],
  },
};

const pick = (a) => a[(Math.random() * a.length) | 0];

// 전투 사건을 보고 동료가 말하게 한다 (Chatter.update 는 CombatMode.update 가 부른다)
export class Chatter {
  constructor(mode) {
    this.mode = mode; this.s = mode.s;
    installRadio(this.s);
    const cfg = mode.cfg, id = String(cfg.story || "");
    this.ctrl = id.startsWith("c") ? "윤채아" : id.startsWith("e") ? "한서윤" : null;   // 관제(본편: 비행단 관제관 등대)
    this.base = id.startsWith("c") ? "모아" : null;                                     // 정비창에서 무전하는 인물
    this.cool = {};
    this.t = 0;
    this.lowSeen = false; this.endSaid = false;
  }

  // 말할 수 있는 사람: 살아 있는 동료(CAST 에 있는 이름) + 관제·정비
  voices(ev) {
    const c = this.mode.combat, wing = this.mode.cfg.wing || [], out = [];
    for (const n of wing) {
      if (!CAST[n]) continue;
      const a = c.actors.find((x) => x.name === n && x.team === this.mode.me.team && x !== this.mode.me);
      if (a && a.alive) out.push(n);
    }
    if (this.extra) for (const n of this.extra) if (CAST[n] && !out.includes(n)) out.push(n);
    if (this.ctrl && (ev === "lowhp" || ev === "shiphit" || ev === "corehit" || ev === "nearend" || ev === "phase2" || ev === "wingdown" || !out.length)) out.push(this.ctrl);
    if (this.base && (ev === "lowhp" || ev === "died" || ev === "boss")) out.push(this.base);
    return out;
  }

  // ev 사건으로 한 줄. cd: 같은 사건 재사용 간격(초)
  say(ev, cd = 20, prio = 1, who = null) {
    if (this.s.cfg.net) return false;
    if ((this.cool[ev] || -1e9) > this.t) return false;
    const L = LINES[ev]; if (!L) return false;
    const vs = who ? [who] : this.voices(ev);
    if (!vs.length) return false;
    const n = pick(vs.filter((v) => L[v]).length && Math.random() < 0.85 ? vs.filter((v) => L[v]) : vs);
    const pool = L[n] || L["*"];
    let line = pick(pool);
    if (line === this.lastLine && pool.length > 1) line = pool[(pool.indexOf(line) + 1) % pool.length];   // 같은 말 연달아 하지 않기
    this.lastLine = line;
    if (!this.s.radioSay(n, line, { prio, ttl: prio >= 2 ? 9 : 5 })) return false;
    this.cool[ev] = this.t + cd;
    return true;
  }

  onKill(a, k) {
    const me = this.mode.me;
    if (!me) return;
    if (a === me) { this.say("died", 40, 1); return; }
    if (a.bossBar && a.team !== me.team) { this.say("boss", 5, 3); return; }
    if (a.team === me.team && a.kind === "bot" && CAST[a.name]) this.say("wingdown", 75, 1);
  }
  onDamage(a, amt) {
    const me = this.mode.me;
    if (!me || a.team !== me.team || a === me) return;
    if (a.tag === "truck" || a.flagship) { if (a.hp / a.maxHp < 0.92) this.say("shiphit", 45, 2); }
    else if (a.kind === "core" && a.hp / a.maxHp < 0.9) this.say("corehit", 45, 2);
  }

  update(dt) {
    const m = this.mode, s = this.s;
    if (m.state !== "run" || m.cut) return;
    this.t += dt;
    const me = m.me, c = m.combat;
    if (!me || !c) return;
    // 빈사: 30% 아래로 떨어지는 순간 (다시 회복하면 다음 번에 또)
    const f = me.alive ? me.hp / me.maxHp : 1;
    if (me.alive && f < 0.3 && !this.lowSeen) { this.lowSeen = true; this.say("lowhp", 25, 2); }
    else if (f > 0.55) this.lowSeen = false;
    // 연속 격파: 3·5·8 연속
    const st = c.killStreak || 0;
    if (st !== this.lastStreak) { this.lastStreak = st; if (st === 3 || st === 5 || st === 8) this.say("streak", 12, 1); }
    // 임무 막바지
    if (!this.endSaid && m.nearEnd && m.nearEnd()) { this.endSaid = true; this.say("nearend", 999, 2); }
  }
}
