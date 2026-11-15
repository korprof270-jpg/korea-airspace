// 스토리 인물 일러스트 목록. 그림 파일을 이 폴더에 넣고 여기에 등록하면 SVG 초상화 대신 쓰인다
// 파일 이름: <id>_<표정>.png (또는 .webp)   예) harin_normal.png, harin_smile.png
// 표정: normal smile angry sad surprise serious — 없는 표정은 normal 로 대신한다
// 규격·인물 설정은 docs/story-art-spec.md 참고
export const ART = {
  노을: { id: "noeul", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  에이아: { id: "eia", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  바르가: { id: "varga", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  차도윤: { id: "doyun", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  모아: { id: "moa", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  바우: { id: "bau", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  "강 교관": { id: "kang", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  서하린: { id: "harin", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  유리: { id: "yuri", ext: "svg", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
  // 서하린: { id: "harin", ext: "png", exprs: ["normal", "smile", "angry", "sad", "surprise", "serious"] },
};
