// fpvproject.github.io 용 서비스 워커: 설치형(PWA) 실행 + 항상 최신 파일
//  업데이트 직후 브라우저에 남은 옛 파일과 새 파일이 섞이면 모듈이 서로 맞지 않아 게임이 시작하지 못한다.
//  같은 사이트의 요청은 매번 서버에 "바뀌었나"를 묻고(no-cache, 바뀌지 않았으면 304로 가볍게) 받는다. 오프라인이면 브라우저 캐시로
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req, { cache: "no-cache" }).catch(() => fetch(req)));
});
