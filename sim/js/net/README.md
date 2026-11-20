# 온라인(PvP) 구조와 모드 통합 API

서버가 없다. claude.ai 아티팩트의 `room` 기능(프레즌스)만으로 동작한다.
`claude.use("room")` 이 null 이면(로컬 서버·직접 연 페이지) 같은 브라우저의 탭끼리 `BroadcastChannel` 로 흉내 낸다.

| 파일 | 역할 |
|---|---|
| `js/net.js` | 전송 계층. `connect()` → `{ kind: "room" \| "local", lobby, join(name), me(), user }`. 이름(`getNick/setNick/cleanName`) |
| `js/pvp.js` | 대기실: 로비 접속자·방 목록·랜덤 매칭(배틀넷)·커스텀 방(방장·팀·컴퓨터·강퇴·시작). `PVP_MODES`, `registerPvpMode()` |
| `js/netgame.js` | 경기 중 동기화 `NetGame`: 플레이어 상태·보간·피해 보고·격추 기록·**호스트 소유 월드 오브젝트** |
| `js/pvpui.js` | PVP 메뉴 화면 (UI 에 섞어 넣음) |
| `js/modes/pvp.js` | 개인전·팀전 모드 (NetGame 사용 예) |

## 원칙
- 프레즌스만 쓴다 (이벤트 topic 은 관리자 전용일 수 있음). 내 프레즌스는 병합 4 KiB 이하, 약 15 Hz 로 보낸다.
- **맞은 쪽 권한**: 쏜 쪽은 대상별 *누적* 피해를 자기 프레즌스에 싣고, 맞은 쪽(또는 그 오브젝트를 가진 호스트)이 늘어난 만큼만 한 번 적용한다. 받은 값은 모두 검사·제한한다 (NaN·범위·한 번에 최대 600).
- 격추는 맞은 쪽이 `dl` 기록으로 알리고, 격추 수는 격추한 쪽이 직접 센다(자기 `k`).
- 호스트 = 방에 가장 먼저 들어온 사람. **월드 오브젝트(봇·몬스터·포탑…)는 경기를 시작할 때의 호스트가 시뮬레이션**한다 (경기 중 호스트가 나가면 그 오브젝트는 사라진다).

## 새 모드 붙이기 (예: 점령전 AOS)
```js
// js/modes/aos.js
import { registerMode } from "../session.js";
import { registerPvpMode } from "../pvp.js";
import { CombatMode } from "./combatmode.js";
import { NetGame } from "../netgame.js";

export class AosMode extends CombatMode {
  constructor(s, cfg) { super(s, cfg); this.ng = new NetGame(this, cfg.net || null); this.P = cfg.pvp || {}; }
  start() {
    const c = this.initCombat({ ffa: false, baseStats: true, skillK: 0.6, spawnPoint: (a) => this.spawn(a) });
    this.me.team = this.P.team || 0; this.me.name = this.P.name || "나";
    this.ng.attach(c);                       // 반드시 initCombat 직후
    this.ng.onDeath = (e) => { /* 피드·점수 */ };
    if (this.ng.owner) { /* 호스트·오프라인: 포탑·코어·몬스터·봇 생성 후 공유 */ }
  }
  update(dt) { super.update(dt); this.ng.update(dt); }
  dispose() { this.ng.dispose(); super.dispose(); }
}
registerMode("aos", AosMode);
registerPvpMode("aos", { name: "점령전 AOS", en: "AOS", icon: "🏯", desc: "…", session: "aos",
  teams: true, teamCounts: [2], maps: ["stadium"], time: [600, 900], random: true });
```
그리고 `main.js`(또는 `ui.js`)에 `import "./modes/aos.js";` 한 줄을 넣으면 커스텀 방 모드 목록(그리고 `random: true` 면 배틀넷)에 나온다.
게임 cfg: `{ mode: def.session, map, time, difficulty, pvp: { variant, teams, team, name, bots: [[id, 팀, "easy"|"normal"|"hard"]], fill, seed, elapsed, players, mid, client }, net: {...} | null }`.
`net` 이 null 이면 **오프라인**(컴퓨터와 혼자: PVP 메뉴의 ‘컴퓨터와 연습’). 이때 `ng.role === "offline"`, `ng.owner === true` 이고 아무것도 보내지 않는다.

## NetGame API
| | |
|---|---|
| `ng.role` | `"host"` \| `"client"` \| `"offline"` (경기 시작 시 고정) |
| `ng.owner` | 호스트·오프라인이면 true — 월드 오브젝트를 직접 시뮬레이션 |
| `ng.online`, `ng.myId` | 온라인 여부, 내 id (peer 라벨, 오프라인 `"me"`) |
| `ng.attach(combat)` / `ng.update(dt)` / `ng.dispose()` | 연결·매 프레임·정리 |
| `ng.defineActorKind(kind, { build(meta, team, id) → { model, radius, name }, meta(actor) → Json })` | 움직이는 전투 액터 종류. 위치·자세·속도·체력·생존·팀·격추/피격추·사격 횟수를 자동으로 싣고, 클라이언트에는 보간되는 대리 액터(`kind: "remote"`)를 `build` 로 만든다. `"bot"` 은 기본 정의됨 |
| `ng.shareActor(kind, actor, id)` | 호스트: 로컬 전투 액터 공유 (`actor.nid = id`). 클라이언트가 대리 액터를 맞히면 자동으로 호스트에 보고되어 `combat.damage(actor, …)` 로 적용된다 |
| `ng.defineKind(kind, { ser(obj) → Json, create(id, data, owner) → obj, apply(obj, data), remove(obj), actor?(obj) → 전투 액터 })` | 임의의 오브젝트(점령 지점·아이템 상자·상점…). `ser` 는 숫자 배열처럼 작게 |
| `ng.share(kind, id, obj)` / `ng.unshare(id)` | 호스트: 공유 시작·중지 (사라지면 클라이언트 쪽은 `remove`) |
| `ng.makeProxy(id, opts)` | 클라이언트 `create()` 안에서 맞힐 수 있는 대리 액터가 필요할 때 (`opts: { owner, name, team, radius, model, hp, maxHp }`) |
| `ng.onHitReport = (id, dmg, attackerId, attackerActor) => {}` | 호스트: 전투 액터가 없는 공유 오브젝트에 들어온 피해 |
| `ng.onDeath = ({ vid, kid, victim, killer, local }) => {}` | 플레이어·공유 액터의 격추 (로컬이든 원격이든 한 번씩) |
| `ng.setField(key, json)` / `ng.field(id, key)` | 플레이어별 모드 값 (경기 내 레벨·업그레이드·보유 아이템 등) |
| `ng.setHostField(key, json)` / `ng.hostField(key)` | 호스트가 싣는 경기 전체 값 (팀 점수·타워 상태 요약 등) |
| `ng.players()` / `ng.actorById(id)` / `ng.nameOf(id)` | 참가자 목록·id → 액터·이름 |

ID 는 `^[A-Za-z0-9_.:-]{1,48}$`. 봇은 `"b0"…`, 다른 종류는 겹치지 않는 접두사를 쓴다 (예: 포탑 `"t3"`, 몬스터 `"m12"`).

### 프레즌스 예산
`g` 하나에 전부 들어간다(4 KiB). 액터 하나 ≈ 70~90 B. 플레이어 상태 ≈ 300 B, 피해 보고는 대상 수에 비례.
호스트가 공유하는 액터는 대략 **25개 이하**로 (움직이지 않는 구조물은 `defineKind` 로 `[hp, 상태]` 정도만).
3.8 KB 를 넘으면 콘솔 경고, 4 KiB 를 넘는 프레즌스는 거부된다.

### 프레즌스 `g` 형식 (짧은 키)
`{ m: 경기 id, t: 보낸 쪽 ms, p, q, v, a, hp, mh, sh, fl: 생존|보호<<1|마비<<2|과충전<<3, tm, k, d, f: 레이저 수, sk: [스킬, 발동 수], ms: [[n, 쏜 id, 표적 id]], dl: [[n, 격추된 id, 격추한 id]], hd: [[맞은 id, 때린 id, 누적 피해, 마비 횟수, 마비 초]], x: 플레이어 값, h: 호스트 값, w: { 종류: [[id, …], …] }, el: 진행 초 }`

## 규칙(PvP)
- `Combat` 의 `baseStats: true` → 파츠 능력치 미적용(`GP.baseLoadout()`), 외형 효과는 유지.
- `skillK: 0.6` → 스킬이 주는 모든 피해(레이저·미사일 직격/폭발·충돌·충격파·EMP·궤도 포격·반사탄) 60%. 스킬 레벨·게이지 획득은 그대로.
- 재출격 3초, 리스폰 보호 3초 (combat.js 그대로).

## 접속 가능 범위 (claude.ai)
아티팩트를 볼 수 있는 로그인 사용자(조직 구성원, 초대된 게스트)만 room 에 연결된다. 공개 링크 방문자·로그아웃 상태는 연결할 수 없다 (오프라인 연습은 가능).
게시할 때 필요한 capability: `{ room: {}, user: { scopes: ["profile"] } }` (topic 은 쓰지 않는다).
