// 스토리 단계 목표: 단계마다 3~4개의 목표 중 정해진 개수(need) 이상 달성해야 클리어. "핵심" 목표는 반드시 달성
// 목표 정의는 저장 가능한 작은 객체: { t: 종류, n: 값, req: 핵심 여부 }
//   win      임무 성공 / 완주 / 촬영 완료        rank n   n위 안
//   crash n  추락·격추 n회 이하 (유지)           kills n  적 n기 격추
//   boss     보스·중간 보스 격파                   truck p  수송 트럭 내구도 p% 이상
//   core p   아군 코어 내구도 p% 이상             time p   제한 시간의 p% 안에 완료
//   stars n  평가 별 n개 이상                     keep p   적정 거리 유지 p% 이상 (트래킹)
//   hp p     끝날 때 기체 내구도 p% 이상

// 목표 완화: 모든 달성 기준을 원래의 약 70% 수준으로
//  격추 수·내구도·유지율은 0.7배, 순위·추락 허용은 한 칸 넉넉히, 시간 목표는 남겨야 하는 여유를 0.7배로
export const EASE = 0.7;
export function easeN(t, n) {
  switch (t) {
    case "kills": return Math.max(1, Math.round(n * EASE));
    case "truck": case "core": case "keep": case "hp": return Math.round(n * EASE / 5) * 5;
    case "time": return Math.min(100, Math.round(100 - (100 - n) * EASE));
    case "stars": return Math.max(1, Math.round(n * EASE));
    case "rank": case "crash": return n + 1;
    default: return n;
  }
}
// 대사·작전 메모에 적힌 목표 숫자도 같은 규칙으로 바꾼다 (기계적으로 읽히는 표현만)
export function easeText(s) {
  return s
    .replace(/(\d+)기( 이상)? 격추/g, (m, n, x) => `${easeN("kills", +n)}기${x || ""} 격추`)
    .replace(/적 (\d+)기([,.!])/g, (m, n, x) => `적 ${easeN("kills", +n)}기${x}`)
    .replace(/내구도(를|는|은)? (\d+)%/g, (m, j, n) => `내구도${j || ""} ${easeN("hp", +n)}%`)
    .replace(/유지 (\d+)%/g, (m, n) => `유지 ${easeN("keep", +n)}%`)
    .replace(/시간(의)? (\d+)% 안/g, (m, j, n) => `시간${j || ""} ${easeN("time", +n)}% 안`);
}

export function objText(o, st) {
  const k = st ? st.kind : "";
  switch (o.t) {
    case "win": return k === "race" ? "완주" : k === "infil" ? "제한 시간 안에 침투" : k === "track" ? "촬영 끝까지 완료" : k === "dm" ? "제한 시간까지 생존 교전" : "임무 성공";
    case "rank": return o.n === 1 ? "1위" : `${o.n}위 안`;
    case "crash": return o.n === 0 ? (k === "race" || k === "infil" || k === "track" ? "추락 없이" : "격추당하지 않기") : (k === "race" || k === "infil" || k === "track" ? `추락 ${o.n}회 이하` : `격추당하는 횟수 ${o.n}회 이하`);
    case "kills": return `적 ${o.n}기 격추`;
    case "boss": return st && st.boss ? `${st.boss.name.replace(/\s*‘.*$/, "")} 격파` : "보스 격파";
    case "truck": return `수송 트럭 내구도 ${o.n}% 이상 지키기`;
    case "core": return `아군 코어 내구도 ${o.n}% 이상 지키기`;
    case "time": return `제한 시간의 ${o.n}% 안에 완료`;
    case "stars": return `평가 별 ${o.n}개 이상`;
    case "keep": return `적정 거리 유지 ${o.n}% 이상`;
    case "hp": return `기체 내구도 ${o.n}% 이상 유지`;
    default: return o.text || "목표";
  }
}

// 단계 종류별 기본 목표
export function defaultObjectives(st, o) {
  const boss = !!st.boss;
  switch (st.kind) {
    case "race": return [{ t: "win", req: true }, { t: "rank", n: o.need >= 3 ? 1 : 2 }, { t: "crash", n: 1 }];
    case "infil": return [{ t: "win", req: true }, { t: "time", n: 86 }, { t: "crash", n: 0 }];
    case "track": return [{ t: "win", req: true }, { t: "keep", n: o.need >= 2 ? 65 : 50 }, { t: "stars", n: o.need >= 2 ? 2 : 1 }, { t: "crash", n: 0 }];
    case "dm": return [{ t: "rank", n: 4 - (o.need || 1), req: true }, { t: "kills", n: Math.max(3, Math.round((o.bots || 5) * 0.8)) }, { t: "crash", n: 2 }, ...(boss ? [{ t: "boss" }] : [])];
    case "escort": return [{ t: "win", req: true }, { t: "truck", n: 60 }, { t: "kills", n: 10 }, ...(boss ? [{ t: "boss" }] : [])];
    case "waves": return [{ t: "win", req: true }, { t: "core", n: 50 }, { t: "crash", n: 1 }, ...(boss ? [{ t: "boss" }] : [])];
    case "strike": case "supply": case "heist": return [{ t: "win", req: true }, { t: "time", n: 75 }, { t: "crash", n: 1 }, ...(boss ? [{ t: "boss" }] : [])];
    case "boss": case "titan": return [{ t: "win", req: true }, { t: "crash", n: 1 }, { t: "kills", n: 8 }, { t: "hp", n: 40 }];
    default: return [{ t: "win", req: true }, { t: "crash", n: 1 }, { t: "kills", n: 5 }];
  }
}
// 필요 개수: 3개 → 2개, 4개 → 3개 (명시하면 그 값)
export const needCount = (list, n) => Math.min(list.length, n || Math.max(2, list.length - 1));

// 진행 중·종료 시점의 측정값
export function metrics(mode, result) {
  const s = mode.s, me = mode.me, c = mode.combat;
  const m = { time: mode.time || 0, done: mode.state === "done", win: result ? result.win !== false && (result.win === true || (result.stars || 0) > 0) : false, stars: result ? result.stars || 0 : 0 };
  m.crash = me ? me.deaths : s.player.crashN || 0;
  m.kills = me ? me.kills : 0;
  m.hp = me ? me.hp / me.maxHp : 1;
  m.rank = mode.rank || 99;
  m.boss = c ? c.bossDown || 0 : 0;
  m.truck = mode.truck ? Math.max(0, mode.truck.hp) / mode.truck.maxHp : 1;
  m.core = mode.base && mode.base.core ? Math.max(0, mode.base.core.hp) / mode.base.core.maxHp : 1;
  const lim = mode.tlim || mode.limit || mode.duration || 0;
  m.timeFrac = lim ? m.time / lim : 0;
  m.keep = mode.keepRatio !== undefined ? mode.keepRatio : mode.keepT !== undefined ? mode.keepT / Math.max(1, m.time) : 0;
  return m;
}

// 판정: { ok: 달성, final: 더 바뀌지 않음, fail: 이미 실패 }
export function judge(o, m) {
  const end = m.done;
  switch (o.t) {
    case "win": return { ok: m.win, final: end };
    case "rank": return { ok: end && m.rank <= o.n && m.win !== false, final: end };
    case "crash": { const bad = m.crash > o.n; return { ok: !bad, final: bad || end, keep: true }; }
    case "kills": return { ok: m.kills >= o.n, final: m.kills >= o.n || end };
    case "boss": return { ok: m.boss > 0, final: m.boss > 0 || end };
    case "truck": return { ok: m.truck * 100 >= o.n, final: end || m.truck * 100 < o.n, keep: true };
    case "core": return { ok: m.core * 100 >= o.n, final: end || m.core * 100 < o.n, keep: true };
    case "time": return { ok: end ? m.win && m.timeFrac * 100 <= o.n : m.timeFrac * 100 <= o.n, final: end || m.timeFrac * 100 > o.n, keep: true };
    case "stars": return { ok: m.stars >= o.n, final: end };
    case "keep": return { ok: m.keep * 100 >= o.n, final: end, keep: true };
    case "hp": return { ok: m.hp * 100 >= o.n, final: end, keep: true };
    default: return { ok: false, final: end };
  }
}

// 결과 판정: 핵심 목표를 모두, 전체 need 개 이상 달성하면 통과
export function evaluate(list, need, m) {
  const res = list.map((o) => ({ o, ok: judge(o, m).ok }));
  const got = res.filter((r) => r.ok).length, reqOk = res.every((r) => !r.o.req || r.ok);
  return { res, got, need, passed: reqOk && got >= need, stars: !reqOk || got < need ? 0 : got === list.length ? 3 : got > need ? 3 : 2 };
}
