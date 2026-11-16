# PixAI 프롬프트 모음 (표정 · 장면 CG · 대화 배경)

PixAI 생성기(pixai.art → 이미지 생성)에 그대로 붙여 넣는 용도. 받은 그림은 대화방에 올려 주면 배경 따기·크기 맞추기·등록은 Claude가 한다.

## 공통 설정
- **모델**: 애니메이션 계열 기본 모델 (지금까지 그림과 화풍이 가장 비슷한 것)
- **네거티브 프롬프트** (모든 그림 공통)
```
lowres, blurry, jpeg artifacts, text, watermark, signature, logo, extra fingers, deformed hands, bad anatomy, extra limbs, cropped head, multiple views, 3d render, photo
```

---

## 1. 표정 그림 (인물당 5장)

- **참조 이미지 필수**: 그 인물의 기존 그림(지금 게임에 들어간 기본 그림)을 참조 이미지(Reference / 캐릭터 참조)로 올린다. 참조 강도는 높게(0.7~0.85).
- **비율**: 세로 2:3 또는 9:16, 기존 그림과 같은 전신 구도
- **프롬프트** = 아래 공통 앞부분 + 표정 한 줄
```
same character as reference, same outfit, same hairstyle, same pose, same full body framing, head to toe visible, high-detail anime gacha illustration, glossy cel shading, crisp lineart, plain solid bright green background (#00FF00), single character, expression:
```
- **표정 줄** (파일 이름 = `<id>_<표정>`)
  - `smile` — `gentle warm smile, relaxed eyes`
  - `angry` — `angry, furrowed brows, gritted teeth, intense glare`
  - `sad` — `sad, teary eyes, lowered brows, slightly downcast`
  - `surprise` — `surprised, wide eyes, small open mouth, eyebrows raised`
  - `serious` — `serious, narrowed focused eyes, closed mouth`

### 인물별 표정 보정 (표정 줄 뒤에 덧붙이면 성격이 더 살아남)
| 인물 (id) | smile | angry | sad | surprise | serious |
|---|---|---|---|---|---|
| 서하린 (harin) | faint reluctant smile, one corner of mouth | cold fury, sharp glare | eyes closed, jaw tight, holding back tears | brief widened eyes, composed | commanding stare |
| 바우 (bau) | big toothy grin, thumbs up | roaring shout, fists clenched | quiet, scratching head, sad smile | jaw dropped, comic shock | arms crossed, determined |
| 유리 (yuri) | shy smile behind tablet | pouting, puffed cheeks | teary eyes behind glasses, hugging tablet | glasses slipping, gasp | glasses glint, typing |
| 차도윤 (doyun) | smug confident smirk | sneer, cold disdain | looking away, bitter | startled, eyes wide under helmet | calm cold focus |
| 모아 (moa) | bright beaming grin, wrench raised | stomping, angry with wrench | sniffling, goggles down | goggles fall, shocked | goggles on, focused grin |
| 강 교관 (kang) | rare small smile under mustache | barking order, veins | weary, looking down | eyebrows raised | stern salute stare |
| 노을 (noeul) | soft glowing smile | flickering hologram, frown | fading translucent, teary | glitching, wide eyes | calm glowing eyes |
| 윤채아 (chaea) | relieved warm smile, slightly teary | stern brows, pressing mic boom | lowered eyes, biting lip | wide eyes, leaning forward | finger on headset, focused |
| 진세라 (sera) | knowing half smile | icy narrowed eyes | looking at map, guilty | eyebrows up, map flickers | analytical, finger on chin |
| 한별 (hanbyeol) | cheerful smile, peace sign | puffed cheeks, scolding | crying, hugging medkit | jumps, wide eyes | calm medic focus |
| 루카 (luka) | cocky grin, finger guns | annoyed scowl | forced smile, eyes sad | flustered, sweat drop | rare serious look, no grin |
| 구철 (gucheol) | sly grin with toothpick | growl, toothpick bitten | tired eyes, looking at metal hand | toothpick drops | sharp appraising stare |
| 에이아 (eia) | eerie serene smile | red core flares, menacing | cracked mask, sorrowful | head tilt, red eye widens | cold red stare |
| 바르가 (varga) | arrogant laugh | roaring, weapons raised | — | — | menacing stare |
| 여명 (yeomyeong) | small hesitant smile | combat mode, red eyes | broken halo flickers, tears | eyes wide, halo sparks | blank emotionless stare |

**우선순위**: 서하린 · 바우 · 유리 · 차도윤 · 모아 · 강 교관 → 윤채아 · 진세라 · 한별 · 루카 · 구철 → 나머지.

---

## 2. 장면 CG (가로 16:9, 배경 있음, 기존 파일 교체)

공통 꼬리말 (각 프롬프트 끝에 붙이기):
```
, cinematic wide shot, anime key visual, high-detail background art, dramatic lighting, gacha game event CG, 16:9
```

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `noeul` | 먼지 쌓인 낡은 시제기 XN-0 발견 | `dusty abandoned prototype racing drone on a workbench in a dark hangar, peeling paint on wingtips, faint engraved "XN-0", single beam of light through dust, mysterious` |
| `rival` | 순백의 최신예기 '백야' 등장 | `pristine white sleek combat drone landing on a launch pad next to a scrappy old drone, stadium crowd in background, spotlight, rivalry` |
| `squad` | 네 대의 기체가 처음 나란히 선 격납고 | `four different combat drones lined up side by side in a hangar, mechanics and pilots silhouettes, warm hangar lights, sense of a new team` |
| `cityfire` | 기계 군단의 도시 습격 | `futuristic Korean city at night under attack by swarms of red-eyed machine drones, burning skyline, searchlights, chaos` |
| `canyonbase` | 협곡 고원 전초기지 | `fortified machine outpost on a canyon plateau, turrets and tanks blocking the canyon pass, red rotating watchtower light, dusk` |
| `snowstrike` | 눈 덮인 도시에 포격 | `artillery shells falling on snow covered rooftops of a quiet town at night, explosions turning the white city orange` |
| `fortress` | 설원 위 거대한 비행 요새 | `colossal four-engine flying fortress blotting out the sky over a snowfield, tiny drones flying beneath it, overwhelming scale` |
| `titan` | 지평선 위 초거대로봇 '거신 오메가' | `mountain-sized giant robot standing on the horizon, glowing red core, huge cannon on its back, tiny city in foreground, awe and dread` |
| `eia` | 달 표면의 붉은 고리들 (위성 영상) | `satellite view of the moon surface covered with endless glowing red rings of machine structures, holographic HUD overlay, ominous` |
| `eiafactory` | 석양 속 스스로 다시 도는 공장 | `huge automated factory at sunset, assembly lines restarting by themselves, robot arms moving, no humans, eerie awakening` |
| `wreck` | 무릎 꿇은 거신의 잔해, 주포는 우주를 겨눔 | `wreck of a giant robot kneeling on the lunar surface, blue earth above, its main cannon pointing away into deep space, quiet aftermath` |
| `moonsky` | 달 위로 떠오르는 지구 (엔딩) | `earthrise over the lunar horizon, a small drone and a pilot silhouette watching, serene, hopeful, soft blue glow` |

---

## 3. 대화 배경 (가로 16:9, 인물 없음)

공통 꼬리말:
```
, no people, empty room, anime background art, visual novel background, high detail, soft depth of field, 16:9
```

| 파일 | 장소 | 프롬프트 |
|---|---|---|
| `briefing` | 브리핑실 | `military drone squadron briefing room, large holographic tactical map table, rows of seats, blue screens, dim lighting` |
| `hangarin` | 격납고 안 | `drone hangar interior, racing drones on maintenance stands, tools and cables, warm work lights, orange accents` |
| `control` | 관제실 | `air traffic control room for drones, curved wall of monitors, radar displays, teal glow, night` |
| `lab` | 연구실 | `high-tech AI research lab, server racks, holographic code, glass walls, cool white light` |
| `night` | 기지 옥상 밤 | `rooftop of a military air base at night, city lights in distance, starry sky, quiet` |

---

## 받은 뒤 처리 (Claude)
- 표정: 녹색 배경 제거 → `sim/img/story/chars/<id>_<표정>.webp` → `art.js` 의 `exprs` 에 추가
- CG·배경: 1920×1080 으로 맞춰 `sim/img/story/<파일>.jpg` 교체 (배경 5종은 CSS 배경 대신 그림 사용으로 전환)
