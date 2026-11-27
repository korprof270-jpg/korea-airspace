// fpvproject.github.io 용 서비스 워커: 설치형(PWA) 실행만 지원. 캐시하지 않아 항상 최신 버전을 받는다
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
