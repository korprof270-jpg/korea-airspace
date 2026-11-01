// 좌표 판정 유틸리티 (외부 의존성 없음)
window.Geo = (function () {
  const R = 6371008.8; // 지구 평균 반경 (m)
  const rad = (d) => (d * Math.PI) / 180;

  function distance([lat1, lng1], [lat2, lng2]) {
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // ray casting — coords: [[lat, lng], ...]
  function inPolygon([lat, lng], coords) {
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const [yi, xi] = coords[i];
      const [yj, xj] = coords[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function contains(zone, point) {
    if (zone.shape === "circle") return distance(point, zone.center) <= zone.radius;
    if (zone.shape === "polygon") return inPolygon(point, zone.coords);
    // polys: [ [바깥 경계, 구멍1, 구멍2...], ... ]
    if (zone.shape === "multipolygon") {
      return zone.polys.some(([outer, ...holes]) => inPolygon(point, outer) && !holes.some((h) => inPolygon(point, h)));
    }
    return false;
  }

  // 내장 데이터로 해당 지점에 걸리는 공역 목록을 반환 (위험도 높은 순)
  function check(point, zones) {
    return zones
      .filter((z) => contains(z, point))
      .sort((a, b) => window.ZONE_TYPES[b.type].rank - window.ZONE_TYPES[a.type].rank);
  }

  return { distance, inPolygon, contains, check };
})();
