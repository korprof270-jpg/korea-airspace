// 앱 셸 캐시 (오프라인에서도 내장 공역 지도/판정 동작)
const CACHE = "airspace-v4";
const SHELL = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "data/zones.js", "js/geo.js", "js/vworld.js", "js/app.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // 검색·공역 API는 항상 네트워크
  if (/nominatim|vworld/.test(url.hostname)) return;

  // 지도 타일: 캐시 우선 (본 적 있는 지역은 오프라인 표시)
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    e.respondWith(
      caches.open("airspace-tiles").then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) c.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // 앱 파일: 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname === "unpkg.com")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
