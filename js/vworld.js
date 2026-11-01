// 국토교통부 V-World 연동 (API 키가 있을 때만 사용)
// V-World는 브라우저 CORS를 허용하지 않는 경우가 많아 JSONP(callback)로 호출합니다.
window.VWorld = (function () {
  const BASE = "https://api.vworld.kr/req";
  const CACHE_KEY = "vworldZones";
  const CACHE_MS = 24 * 60 * 60 * 1000;

  // 공역 관련 레이어 (데이터 API 이름 / 속성 접두어)
  const LAYERS = [
    { data: "LT_C_AISPRHC", prefix: "prh", type: "prohibited", label: "비행금지구역" },
    { data: "LT_C_AISRESC", prefix: "res", type: "restricted", label: "비행제한구역" },
    { data: "LT_C_AISCTRC", prefix: "ctr", type: "control", label: "관제권" },
    { data: "LT_C_AISDNGC", prefix: "dng", type: "restricted", label: "위험구역" },
  ];

  let seq = 0;
  function jsonp(url, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const cb = `__vw_cb_${Date.now()}_${seq++}`;
      const script = document.createElement("script");
      const timer = setTimeout(() => { cleanup(); reject(new Error("V-World 응답 시간 초과")); }, timeoutMs);
      function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        script.remove();
      }
      window[cb] = (data) => { cleanup(); resolve(data); };
      script.onerror = () => { cleanup(); reject(new Error("V-World 요청 실패")); };
      script.src = `${url}&callback=${cb}`;
      document.head.appendChild(script);
    });
  }

  function qs(params) {
    return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  }

  // 주소/장소 검색 → [{ name, detail, lat, lng }]
  async function search(query, key) {
    const out = [];
    for (const [type, category] of [["address", "road"], ["address", "parcel"], ["place", ""]]) {
      const params = {
        service: "search", request: "search", version: "2.0", crs: "EPSG:4326",
        size: 6, page: 1, query, type, format: "json", errorformat: "json", key, domain: location.origin,
      };
      if (category) params.category = category;
      try {
        const res = await jsonp(`${BASE}/search?${qs(params)}`);
        const items = res?.response?.result?.items || [];
        for (const it of items) {
          out.push({
            name: it.title || it.address?.road || it.address?.parcel,
            detail: it.address?.road || it.address?.parcel || it.category || "",
            lat: parseFloat(it.point.y),
            lng: parseFloat(it.point.x),
          });
        }
      } catch (_) { /* 다음 유형으로 계속 */ }
      if (out.length) break;
    }
    return out;
  }

  // 전국 공식 공역을 내려받아 앱 공역 형식으로 변환 (하루 동안 캐시)
  async function loadZones(key) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.at < CACHE_MS && cached.zones?.length) return cached;
    } catch (_) { /* 캐시 없음 */ }

    const zones = [];
    await Promise.all(LAYERS.map(async (layer) => {
      const params = {
        service: "data", request: "GetFeature", data: layer.data, key, domain: location.origin,
        geomFilter: "BOX(124,33,132,39)", crs: "EPSG:4326", format: "json", errorformat: "json",
        size: 1000, geometry: "true",
      };
      const res = await jsonp(`${BASE}/data?${qs(params)}`);
      const status = res?.response?.status;
      if (status === "NOT_FOUND") return;
      if (status !== "OK") throw new Error(res?.response?.error?.text || "V-World 데이터 조회 오류");
      const features = res.response.result?.featureCollection?.features || [];
      features.forEach((f, i) => {
        const z = toZone(f, layer, i);
        if (z) zones.push(z);
      });
    }));

    const result = { at: Date.now(), zones };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch (_) { /* 용량 초과 시 캐시 생략 */ }
    return result;
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (_) { /* 무시 */ }
  }

  function toZone(f, layer, i) {
    const g = f.geometry;
    if (!g) return null;
    const flip = (ring) => ring.map(([x, y]) => [y, x]);
    const polys = g.type === "MultiPolygon" ? g.coordinates.map((p) => p.map(flip))
      : g.type === "Polygon" ? [g.coordinates.map(flip)] : null;
    if (!polys) return null;

    const p = f.properties || {};
    const name = featureName(p, layer.prefix) || layer.label;
    const alts = [p[`${layer.prefix}_lbl_2`], p[`${layer.prefix}_lbl_3`]].filter(Boolean);
    if (alts.length === 2 && /GND|SFC/i.test(alts[1])) alts.reverse();
    const notes = [];
    if (layer.label !== TYPE_LABELS[layer.type]) notes.push(layer.label);
    if (alts.length) notes.push(`고도 ${alts.join(" ~ ")}`);
    if (p[`${layer.prefix}_lbl_4`]) notes.push(p[`${layer.prefix}_lbl_4`]);

    return {
      id: `${layer.data}-${i}`, name, short: name, type: layer.type,
      outer: layer.prefix === "prh" && p.prh_typ === "2",
      shape: "multipolygon", polys, note: notes.join(" · "),
    };
  }

  const TYPE_LABELS = { prohibited: "비행금지구역", restricted: "비행제한구역", control: "관제권" };

  function featureName(p, prefix) {
    let n = p[`${prefix}_lbl_1`];
    if (!n) {
      // 일부 피처는 이름이 서식 태그 안에만 들어 있음
      const tagged = Object.values(p).find((v) => typeof v === "string" && v.includes("<")) || "";
      n = tagged.replace(/<UND>.*?<\/UND>/g, " ").replace(/<[^>]+>/g, "");
    }
    return String(n).replace(/^RK\s*/, "").trim();
  }

  return { search, loadZones, clearCache };
})();
