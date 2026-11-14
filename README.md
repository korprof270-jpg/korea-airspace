# 드론 공역 지도 (대한민국)

지도에서 비행금지구역·관제권·비행제한구역을 보고, **주소를 입력하면 그 지점에서 드론을 날릴 수 있는지** 판정하는 앱입니다.
하나의 코드로 **웹 브라우저**, **설치형 앱(PWA)**, **Android/iOS 네이티브 앱(Capacitor)** 에서 모두 동작합니다.

## 기능
- 지도에 공역 표시 (금지 = 빨강 면, 관제권 = 보라 점선, 제한 = 주황 빗금, 원전 외곽 = 빨강 점선)
- 범례에서 유형별 켜기/끄기, 확대 시 공역 이름표 표시, 판정 지점에 걸린 공역 강조
- 주소/장소 검색 → 해당 지점 판정: **비행 가능 / 비행승인 필요 / 비행 불가**
- 지도 아무 곳이나 탭해서 판정, ◎ 버튼으로 현재 위치 판정
- 근처 공역 경고 (경계 2km 이내)
- URL로 바로 조회: `index.html?q=서울 여의도공원` 또는 `?lat=37.52&lng=126.92`
- 오프라인에서도 내장 데이터로 판정 (서비스 워커 캐시)

## 드론 정비 3D 시뮬레이터
`simulator/index.html` — 쿼드콥터를 작업대 위에서 직접 조립·배선하고, 미션플래너 설정 메뉴를 따라 설정한 뒤 결과를 눈으로 확인하는 학습용 시뮬레이터입니다. (`npm start` 후 http://localhost:8080/simulator/)
- **하드웨어 조립**: 2종급 크기 쿼드콥터. 모터(축 나사 방향 2종)·ESC·프로펠러(뒤집어 끼우기 가능)·FC·파워 모듈·배터리·GPS·수신기·텔레메트리를 360° 돌려 보며 장착. 하판 PDB 패드의 전원선 극성, 모터선 3가닥 순서, 커넥터 모양(6핀·4핀·3핀)별 FC 포트 배선. 화면에는 규격·정답을 표시하지 않고, 정답은 '정답 확인'에서만 볼 수 있음
- **소프트웨어 설정**: 프레임 타입, 가속도계·나침반·라디오·ESC 교정, 비행 모드, 페일세이프, 배터리 모니터, 서보 출력, 보드 방향, 튜닝, 전체 파라미터 (ArduCopter 파라미터 이름 사용)
- **테스트**: 시동 전 점검(PreArm), 모터 테스트(A~D), 자세 센서(HUD), 비행 테스트(Stabilize/AltHold/Loiter/RTL/Land, 라디오·배터리 페일세이프), 고장 진단 훈련
- 틀리게 조립하거나 설정하면 그 결과(전복, 제자리 회전, 흐름, 추락)가 비행 물리에 그대로 나타납니다. 실제 기체의 수치를 근사한 교육용 모델이며 실기체 튜닝 값으로 쓰면 안 됩니다.

## 데이터 출처 — 반드시 읽어주세요
| 모드 | 공역 데이터 | 주소 검색 |
|---|---|---|
| 기본 (키 없음) | `data/zones.js` 내장 **개략** 데이터 | OpenStreetMap Nominatim |
| V-World 키 입력 | 국토교통부 V-World **공식** 공역 레이어(지도 + 판정) | V-World 검색 API |

내장 데이터는 공항 관제권(반경 9.3km), 원자력시설(3.7km/18.5km), P-73, P-518, R-75 등을 **근사한 원/다각형**입니다.
실제 고시 경계와 다를 수 있으니 실제 비행 전에는 V-World 키를 설정하거나 [드론원스톱](https://drone.onestop.go.kr)에서 확인하세요.
특히 P-73은 대통령 집무실 위치에 따라 바뀌므로 `data/zones.js`에서 중심 좌표를 확인해 주세요.

### V-World 키 설정
1. https://www.vworld.kr 회원가입 → 인증키 발급 (사용 API: 2D 데이터, WMS/WFS, 검색, 지오코더)
2. 서비스 URL에 앱을 배포할 주소(예: `https://내도메인`, 로컬 테스트는 `http://localhost:8080`) 등록
3. 앱 우측 ⚙ → 키 입력 → 저장

## 실행
### 웹
```bash
npm start
```
→ http://localhost:8080 . 정적 파일이므로 GitHub Pages·Netlify 등 아무 정적 호스팅에 그대로 올리면 됩니다.
(HTTPS 주소에서 열면 휴대폰에서 "홈 화면에 추가"로 앱처럼 설치됩니다.)

### Android / iOS 네이티브 앱
```bash
npm install
npx cap add android
npm run android
```
Android Studio가 열리면 실행/APK 빌드. iOS는 macOS + Xcode에서 `npx cap add ios` 후 `npm run ios`.
네이티브 앱에서 현재 위치를 쓰려면 Android `AndroidManifest.xml`에 위치 권한, iOS `Info.plist`에 `NSLocationWhenInUseUsageDescription`을 추가하세요.

## 구조
```
index.html            화면
styles.css
data/zones.js         내장 공역 데이터 (수정·추가 가능)
js/geo.js             거리·다각형 포함 판정
js/vworld.js          V-World 공식 레이어/검색/판정 (JSONP)
js/app.js             지도·검색·결과 화면
sw.js, manifest.webmanifest   PWA
capacitor.config.json, scripts/build.mjs   네이티브 앱 빌드
simulator/            드론 정비 3D 시뮬레이터 (core 상태·검사 / scene 3D / flight 물리 / ui 화면)
```

## 면책
이 앱은 참고용입니다. 비행 가능 여부의 최종 판단과 비행승인·촬영허가 책임은 조종자에게 있습니다.
