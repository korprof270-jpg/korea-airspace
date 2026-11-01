(function () {
  const TYPES = window.ZONE_TYPES;
  const KOREA_BOUNDS = L.latLngBounds([32.8, 124.5], [38.9, 131.0]);

  const $ = (id) => document.getElementById(id);
  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* 저장 불가 환경 무시 */ } },
  };

  let vworldKey = storage.get("vworldKey", "");
  // 현재 지도·판정에 쓰는 공역 목록과 출처
  let activeZones = window.AIRSPACE_ZONES;
  let source = { official: false, at: null };

  // ── 지도 ──────────────────────────────────────────
  const map = L.map("map", { zoomControl: false, maxBounds: KOREA_BOUNDS.pad(0.5) }).setView([36.4, 127.8], 7);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // 공역 색이 잘 보이도록 기본 지도는 채도를 낮춰 표시 (styles.css .muted-tiles)
  const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const simpleMap = L.tileLayer(OSM, { maxZoom: 19, attribution: "© OpenStreetMap", className: "muted-tiles" }).addTo(map);
  const detailMap = L.tileLayer(OSM, { maxZoom: 19, attribution: "© OpenStreetMap" });

  // 비행제한구역 빗금 패턴 (SVG <pattern>)
  const svgRenderer = L.svg({ padding: 0.5 }).addTo(map);
  (function addHatch(svg, id, color) {
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="9" height="9" fill="${color}" fill-opacity="0.08"/>
      <line x1="0" y1="0" x2="0" y2="9" stroke="${color}" stroke-width="3" stroke-opacity="0.45"/></pattern>`;
    svg.insertBefore(defs, svg.firstChild);
  })(svgRenderer._container, "hatch-restricted", TYPES.restricted.color);

  function zoneStyle(z) {
    const t = TYPES[z.type];
    const s = { color: t.color, fillColor: t.hatch ? "url(#hatch-restricted)" : t.color, ...t.style, renderer: svgRenderer };
    if (z.outer) Object.assign(s, { weight: 1.5, dashArray: "3 5", fillOpacity: 0.08 });
    return s;
  }

  function shortName(z) {
    if (z.short) return z.short;
    return z.id.startsWith("CTR-") ? z.name.replace(" 관제권", "") : z.id;
  }

  // 유형별 레이어 (범례에서 켜고 끔). 위험도 낮은 유형부터 추가해 금지구역이 맨 위에 그려지게 함
  const zonesLayer = L.layerGroup().addTo(map);
  const typeLayers = {};
  for (const type of Object.keys(TYPES).sort((a, b) => TYPES[a].rank - TYPES[b].rank)) {
    typeLayers[type] = L.layerGroup().addTo(zonesLayer);
  }
  const zoneShapes = new Map();
  const highlighted = new Set();

  function drawZones(zones) {
    Object.values(typeLayers).forEach((g) => g.clearLayers());
    zoneShapes.clear();
    highlighted.clear();
    for (const z of [...zones].sort((a, b) => (b.outer ? 1 : 0) - (a.outer ? 1 : 0))) {
      const style = zoneStyle(z);
      const t = TYPES[z.type];
      const shape = z.shape === "circle" ? L.circle(z.center, { ...style, radius: z.radius })
        : L.polygon(z.shape === "polygon" ? z.coords : z.polys, style);
      shape.bindTooltip(`<b>${escapeHtml(z.name)}</b><br>${z.outer ? "승인 필요" : t.verdict}`, { sticky: true });
      shape.on("click", (e) => checkLocation(e.latlng.lat, e.latlng.lng));
      shape.on("mouseover", () => shape.setStyle({ weight: style.weight + 2 }));
      shape.on("mouseout", () => { if (!highlighted.has(shape)) shape.setStyle({ weight: style.weight }); });
      shape.baseStyle = style;
      zoneShapes.set(z.id, shape);
      typeLayers[z.type].addLayer(shape);

      // 지도 위 이름표: 원은 위쪽 경계, 다각형은 중앙
      const at = z.shape === "circle" ? [z.center[0] + z.radius / 111320, z.center[1]] : shape.getBounds().getCenter();
      typeLayers[z.type].addLayer(L.marker(at, {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: "zone-label-wrap", iconSize: null, html: `<span class="zone-label${z.us ? " us" : ""}" style="--c:${t.color}">${escapeHtml(shortName(z))}</span>` }),
      }));
    }
  }
  drawZones(activeZones);

  // 축소 상태에서는 이름표를 숨겨 지도를 깔끔하게 유지
  const updateLabels = () => map.getContainer().classList.toggle("labels-hidden", map.getZoom() < 9);
  map.on("zoomend", updateLabels);
  updateLabels();

  // 판정한 지점에 걸린 공역은 굵게 강조
  function highlightZones(ids) {
    for (const s of highlighted) s.setStyle({ weight: s.baseStyle.weight });
    highlighted.clear();
    for (const id of ids) {
      const s = zoneShapes.get(id);
      if (!s) continue;
      s.setStyle({ weight: s.baseStyle.weight + 2.5 });
      highlighted.add(s);
    }
  }

  // 범례 (유형별 표시 켜기/끄기 + 데이터 출처)
  const legend = $("legend");
  for (const [type, t] of Object.entries(TYPES).sort((a, b) => b[1].rank - a[1].rank)) {
    const row = document.createElement("label");
    row.innerHTML = `<input type="checkbox" checked /><span class="sw sw-${type}"></span><span><b>${t.label}</b><small>${t.verdict}</small></span>`;
    row.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) zonesLayer.addLayer(typeLayers[type]); else zonesLayer.removeLayer(typeLayers[type]);
    });
    legend.appendChild(row);
  }
  legend.insertAdjacentHTML("beforeend",
    `<div class="legend-note"><span class="sw sw-outer"></span>원전 외곽(B구역)</div>` +
    `<div class="legend-note"><span class="tag tag-us">미군</span>미군 관할 비행장</div><div class="legend-source" id="legend-source"></div>`);
  function updateSourceLabel(text) {
    $("legend-source").textContent = text || (source.official ? "데이터: V-World 공식" : "데이터: 내장 개략치");
  }
  updateSourceLabel();

  L.control.layers({ "간결한 지도": simpleMap, "상세 지도": detailMap }, { "공역": zonesLayer }, { position: "bottomright" }).addTo(map);

  // V-World 키가 있으면 공식 공역으로 교체 (실패 시 내장 데이터 유지)
  async function loadOfficial() {
    if (!vworldKey) {
      activeZones = window.AIRSPACE_ZONES;
      source = { official: false, at: null };
      drawZones(activeZones);
      updateSourceLabel();
      return;
    }
    updateSourceLabel("데이터: V-World 불러오는 중…");
    try {
      const { zones, at } = await VWorld.loadZones(vworldKey);
      if (!zones.length) throw new Error("공역 데이터가 비어 있습니다");
      activeZones = zones;
      source = { official: true, at };
      drawZones(activeZones);
      // 불러오기 전에 판정한 지점이 있으면 공식 데이터로 다시 판정
      if (marker && !$("result").hidden) checkLocation(marker.getLatLng().lat, marker.getLatLng().lng, lastLabel);
    } catch (err) {
      toast(`공식 공역을 불러오지 못해 내장 데이터를 사용합니다 (${err.message})`);
    }
    updateSourceLabel();
  }
  loadOfficial();

  let marker = null;

  // ── 주소 검색 ───────────────────────────────────────
  async function geocode(query) {
    if (vworldKey) {
      try {
        const r = await VWorld.search(query, vworldKey);
        if (r.length) return r;
      } catch (_) { /* Nominatim으로 대체 */ }
    }
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&accept-language=ko&limit=8&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("주소 검색 실패");
    const data = await res.json();
    return data.map((d) => ({
      name: d.name || d.display_name.split(",")[0],
      detail: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
  }

  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=ko&zoom=17&lat=${lat}&lon=${lng}`;
      const res = await fetch(url);
      if (!res.ok) return "";
      const d = await res.json();
      return d.display_name || "";
    } catch (_) { return ""; }
  }

  const resultsEl = $("search-results");
  $("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = $("search-input").value.trim();
    if (!q) return;
    $("search-input").blur();
    resultsEl.hidden = false;
    resultsEl.innerHTML = "<li>검색 중…</li>";
    try {
      const items = await geocode(q);
      if (!items.length) { resultsEl.innerHTML = "<li>검색 결과가 없습니다. 주소를 더 자세히 입력해 보세요.</li>"; return; }
      if (items.length === 1) { resultsEl.hidden = true; return selectPlace(items[0]); }
      resultsEl.innerHTML = "";
      for (const it of items) {
        const li = document.createElement("li");
        li.tabIndex = 0;
        li.innerHTML = `${escapeHtml(it.name)}<small>${escapeHtml(it.detail)}</small>`;
        li.addEventListener("click", () => { resultsEl.hidden = true; selectPlace(it); });
        li.addEventListener("keydown", (ev) => { if (ev.key === "Enter") li.click(); });
        resultsEl.appendChild(li);
      }
    } catch (err) {
      resultsEl.innerHTML = `<li>오류: ${escapeHtml(err.message)}</li>`;
    }
  });
  $("search-input").addEventListener("input", (e) => { if (!e.target.value) resultsEl.hidden = true; });

  function selectPlace(it) {
    map.setView([it.lat, it.lng], 13);
    checkLocation(it.lat, it.lng, it.detail || it.name);
  }

  // ── 공역 판정 ───────────────────────────────────────
  map.on("click", (e) => { resultsEl.hidden = true; checkLocation(e.latlng.lat, e.latlng.lng); });

  let checkSeq = 0;
  let lastLabel;
  function checkLocation(lat, lng, label) {
    const mySeq = ++checkSeq;
    lastLabel = label;
    const point = [lat, lng];
    if (marker) marker.setLatLng(point); else marker = L.marker(point).addTo(map);

    const allHits = Geo.check(point, activeZones);
    highlightZones(allHits.map((z) => z.id));
    // 공식 데이터에 같은 공역이 중복 등록된 경우가 있어 이름 기준으로 하나만 표시
    const seen = new Set();
    const hits = allHits.filter((z) => !seen.has(z.type + z.name) && seen.add(z.type + z.name));
    const state = { lat, lng, label: label || "주소 확인 중…", hits, nearby: nearbyZones(point, hits) };
    render(state);

    if (!label) reverseGeocode(lat, lng).then((addr) => {
      if (mySeq !== checkSeq) return;
      state.label = lastLabel = addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      render(state);
    });
  }

  // 원형 공역 중 경계에서 2km 이내로 근접한 것 (내장 데이터일 때)
  function nearbyZones(point, hits) {
    const hitIds = new Set(hits.map((h) => h.id));
    return activeZones.filter((z) => z.shape === "circle" && !hitIds.has(z.id))
      .map((z) => ({ zone: z, gap: Geo.distance(point, z.center) - z.radius }))
      .filter((n) => n.gap <= 2000)
      .sort((a, b) => a.gap - b.gap);
  }

  function verdictOf(hits) {
    const top = hits.reduce((m, h) => Math.max(m, h.outer ? 2 : TYPES[h.type].rank), 0);
    if (top === 3) return { cls: "no", text: "비행 불가 (비행금지구역)" };
    if (top >= 1) return { cls: "warn", text: "비행승인 필요" };
    return { cls: "ok", text: "비행 가능 구역" };
  }

  function render(s) {
    const v = verdictOf(s.hits);
    const outside = !KOREA_BOUNDS.contains([s.lat, s.lng]);

    let html = `<h2 class="verdict ${v.cls}"><span class="dot"></span>${v.text}</h2>`;
    html += `<p class="place">${escapeHtml(s.label)}<br><small>${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</small></p>`;
    if (outside) html += `<p class="place">⚠ 대한민국 영역 밖의 지점입니다.</p>`;

    if (s.hits.length) {
      html += `<ul class="zone-list">`;
      for (const h of s.hits) {
        const t = TYPES[h.type];
        html += `<li><span class="tag" style="background:${t.color}">${t.label}</span>${h.us ? `<span class="tag tag-us">미군</span>` : ""}<b>${escapeHtml(h.name)}</b>`;
        if (h.note) html += `<small>${escapeHtml(h.note)}</small>`;
        html += `</li>`;
      }
      html += `</ul>`;
    }
    if (s.nearby.length) {
      html += `<p class="place">주변 공역 (경계 2km 이내): ` +
        s.nearby.map((n) => `${escapeHtml(n.zone.name)} 약 ${(n.gap / 1000).toFixed(1)}km`).join(", ") + `</p>`;
    }

    html += `<ul class="rules">
      <li>고도 150m 이하, 육안 가시권 내 비행</li>
      <li>야간 비행, 사람이 많은 곳(행사장·군중) 상공 비행 금지</li>
      <li>국립공원·군사시설·발전소 등은 별도 허가가 필요할 수 있음</li>
      <li>항공촬영은 비행승인과 별도로 촬영허가(국방부) 필요</li>
    </ul>`;

    html += source.official
      ? `<p class="source">판정 기준: 국토교통부 V-World 공식 공역 데이터 (${new Date(source.at).toLocaleString("ko-KR")} 기준)</p>`
      : `<p class="source">판정 기준: 내장 개략 데이터 — 참고용이며 실제 경계와 다를 수 있습니다. ⚙에서 V-World 키를 넣으면 공식 데이터로 판정합니다.</p>`;
    html += `<p class="links">
      <a href="https://drone.onestop.go.kr" target="_blank" rel="noopener">드론원스톱 비행승인 신청</a>
      <a href="https://map.vworld.kr" target="_blank" rel="noopener">V-World 지도</a>
    </p>`;

    $("result-body").innerHTML = html;
    $("result").hidden = false;
  }

  $("result-close").addEventListener("click", () => {
    $("result").hidden = true;
    highlightZones([]);
    if (marker) { marker.remove(); marker = null; }
  });

  // ── 내 위치 ─────────────────────────────────────────
  $("btn-locate").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("이 기기에서는 위치 기능을 사용할 수 없습니다.");
    toast("현재 위치 확인 중…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 14);
        checkLocation(latitude, longitude);
      },
      () => toast("위치 권한이 거부되었거나 위치를 가져올 수 없습니다."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // ── 설정 ───────────────────────────────────────────
  const dlg = $("settings");
  $("btn-settings").addEventListener("click", () => {
    $("vworld-key").value = vworldKey;
    dlg.showModal();
  });
  dlg.addEventListener("close", () => {
    if (dlg.returnValue !== "save") return;
    const newKey = $("vworld-key").value.trim();
    if (newKey !== vworldKey) VWorld.clearCache();
    vworldKey = newKey;
    storage.set("vworldKey", vworldKey);
    loadOfficial();
  });

  // ── 공통 ───────────────────────────────────────────
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // URL 파라미터로 바로 조회: ?q=주소  또는  ?lat=..&lng=..
  const params = new URLSearchParams(location.search);
  if (params.get("q")) { $("search-input").value = params.get("q"); $("search-form").requestSubmit(); }
  else if (params.get("lat") && params.get("lng")) {
    const lat = parseFloat(params.get("lat")), lng = parseFloat(params.get("lng"));
    map.setView([lat, lng], 13);
    checkLocation(lat, lng);
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
