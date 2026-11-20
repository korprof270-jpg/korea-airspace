// 스토리 인물 일러스트 목록. 그림 파일을 이 폴더에 넣고 여기에 등록하면 SVG 초상화 대신 쓰인다
// 파일 이름: <id>_<표정>.png (또는 .webp)   예) harin_normal.png, harin_smile.png
// 표정: normal smile angry sad surprise serious — 없는 표정은 normal 로 대신한다
// 규격·인물 설정은 docs/story-art-spec.md 참고
// 인물 normal 그림은 모두 PixAI Shiitake-Mix v1.0 화풍 (XN-0 제외)
// 표정 그림(smile·serious 등)은 PixAI(Tsubaki.3)로 normal 그림을 참조해 생성
// 주석 처리된 svg 목록은 품질 문제로 사용 중지한 시안
export const ART = {
  서하린: { id: "harin", ext: "webp", exprs: ["normal", "smile", "serious", "angry", "sad"] },   // 힉스필드 생성 그림
  노을: { id: "noeul", ext: "webp", exprs: ["normal", "smile", "sad", "serious", "surprise"] },   // Shiitake-Mix
  바우: { id: "bau", ext: "webp", exprs: ["normal", "surprise", "serious", "sad"] },
  유리: { id: "yuri", ext: "webp", exprs: ["normal", "serious", "surprise", "sad"], sc: 0.88 },
  차도윤: { id: "doyun", ext: "webp", exprs: ["normal", "smile", "serious", "angry"] },
  모아: { id: "moa", ext: "webp", exprs: ["normal", "surprise", "sad"], sc: 0.8 },
  "강 교관": { id: "kang", ext: "webp", exprs: ["normal"] },
  에이아: { id: "eia", ext: "webp", exprs: ["normal"] },
  바르가: { id: "varga", ext: "webp", exprs: ["normal"] },
  한서윤: { id: "seoyun", ext: "webp", exprs: ["normal", "sad", "smile"] },   // Shiitake-Mix
  "차 장군": { id: "general", ext: "webp", exprs: ["normal"] },
  강도현: { id: "dohyun", ext: "webp", exprs: ["normal"] },
  EIA: { id: "eia0", ext: "webp", exprs: ["normal"] },
  아샤: { id: "asha", ext: "webp", exprs: ["normal"] },
  니르바: { id: "nirva", ext: "webp", exprs: ["normal"] },
  카르타: { id: "karta", ext: "webp", exprs: ["normal"] },
  윤채아: { id: "chaea", ext: "webp", exprs: ["normal"] },
  진세라: { id: "sera", ext: "webp", exprs: ["normal"] },
  한별: { id: "hanbyeol", ext: "webp", exprs: ["normal"] },
  루카: { id: "luka", ext: "webp", exprs: ["normal"] },
  여명: { id: "yeomyeong", ext: "webp", exprs: ["normal"] },
  구철: { id: "gucheol", ext: "webp", exprs: ["normal"] },
  "XN-0": { id: "xn0", ext: "webp", exprs: ["normal"] },   // 사용자 제공 그림 (노을의 이전 모습). sad·smile 은 크레딧 충전 후 추가 예정
  // 노을: { id: "noeul", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 에이아: { id: "eia", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 바르가: { id: "varga", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 차도윤: { id: "doyun", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 모아: { id: "moa", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 바우: { id: "bau", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // "강 교관": { id: "kang", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 서하린: { id: "harin", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 유리: { id: "yuri", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 한서윤: { id: "seoyun", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // "차 장군": { id: "general", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 강도현: { id: "dohyun", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // EIA: { id: "eia0", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 서하린: { id: "harin", ext: "png", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
};
