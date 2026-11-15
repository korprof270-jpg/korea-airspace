# 장면 선택 → 작전 변경 규격 (작가팀용)

선택지 객체에 `mod` 를 붙이면 이후 단계의 작전이 바뀐다. 여러 단계를 한 번에 바꿀 수 있다.

```js
{ t: "“바우 선배, 같이 가요.”", rel: { 바우: 1 },
  mod: { "c3-2": { team: 2, wing: ["바우", "서하린"], note: "바우가 호위에 합류", objAdd: [{ t: "truck", n: 80 }] } },
  then: ["바우:smile|하하! 트럭은 내 등 뒤에 있으면 안전하지!"] }
```

## mod 키 (그 외 키는 검사기에서 오류)
| 키 | 뜻 |
|---|---|
| `team` | 윙맨 수 (0~3). 편대 임무(waves strike escort supply heist boss titan)에만 적용 |
| `wing` | 윙맨 이름 배열 (team 개 이상). 예: `["바우","유리"]` |
| `power` | 적 규모 배율 (기본 0.8~1.4) |
| `diff` | "easy" / "normal" / "hard" |
| `bots`, `time` | 공중전(dm) 적 수, 제한 시간(초) |
| `laps`, `rivals`, `limitK` | 레이스 바퀴 수, 라이벌 수, 침투 제한 시간 배율(작을수록 빡빡) |
| `boss` | 보스 바꾸기: `{ name, kind: "gunship"(중간 보스)|"boss", unit: "tank"|"aa"|"frigate"|"cruiser"|"mech", at: 등장 초, hp, scale }`. `null` 이면 보스 제거 |
| `objAdd` | 목표 추가/교체: `[{ t, n }]` (아래 종류) |
| `objDel` | 목표 종류 제거: `["boss"]` (핵심 목표는 못 지움) |
| `objNeed` | 필요 달성 수 직접 지정 |
| `note` | 브리핑에 뜨는 한 줄 "⚑ 작전 변경 · …" (꼭 넣을 것) |

## 목표 종류 (`t`)
win(임무 성공) · rank n(n위 안) · crash n(격추/추락 n회 이하) · kills n(적 n기 격추) · boss(보스 격파) ·
truck p(트럭 내구도 p%↑, escort) · core p(코어 p%↑, waves) · time p(제한 시간 p% 안, strike/supply/heist/infil) ·
stars n(평가 별 n↑) · keep p(트래킹 적정 거리 유지 p%↑) · hp p(끝날 때 내구도 p%↑)

각 단계는 기본 목표 3~4개 중 n-1개(핵심 포함) 이상 달성해야 클리어된다. 목표는 단계 종류에 맞는 것만 쓸 것.
