import { height as snowH } from "./snow.js";
import { height as moonH } from "./moon.js";
// 트래킹 피사체 추가: 스키어·슈퍼카·오토바이·헬기·레이싱 드론. 맵 파일은 건드리지 않고 기존 코스·피사체 경로를 재사용한다
const gatePath = (map, id, v) => {
  const t = map.tracks.find((x) => x.id === id);
  if (!t) return null;
  return t.gates.map((g) => [g.p[0], g.p[1] + (g.t === "flag" ? 3 : g.t === "square" && (g.pitch || 0) === 0 ? 0 : 0), g.p[2], v]);
};
const ring = (cx, cz, r, y, n, v, dir = 1) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 * dir; return [cx + Math.cos(a) * r, y + Math.sin(a * 3) * 6, cz + Math.sin(a) * r, v]; });
const faster = (map, id, k, maxV) => { const t = map.tracking.find((x) => x.id === id); return t ? t.path.map((p) => [p[0], p[1], p[2], Math.min(maxV, (p[3] ?? 8) * k)]) : null; };

// 지형을 따라 일정 높이로 뜬 비행 경로: 앞뒤 점의 지면 중 높은 쪽 + lift
const hover = (pts, H, lift) => pts.map((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length]; return [p[0], Math.max(H(p[0], p[2]), H(a[0], a[2]), H(b[0], b[2])) + lift, p[2], p[3]]; });

const ADD = {
  snow: (m) => [{ id: "convoy", name: "제국 수송정", type: "shuttle", level: 2, desc: "거대한 기계 부품을 싣고 설원을 가로지르는 제국 수송정을 화면에 담으세요", duration: 80, path: hover(ring(0, 0, 150, 0, 18, 15), snowH, 26) },
    { id: "skier", name: "활강 스키어", type: "skier", level: 2, desc: "슬라럼 깃발 사이로 내려꽂히는 스키어를 따라가세요", duration: 34, closed: false, path: gatePath(m, "downhill", 14) },
    { id: "fpv", name: "빙하 레이서", type: "fpv", level: 3, desc: "크레바스와 얼음 동굴을 누비는 레이싱 드론", duration: 70, path: gatePath(m, "glacier", 20) }],
  city: (m) => [{ id: "supercar", name: "슈퍼카", type: "supercar", level: 3, desc: "금융가를 시속 120km 로 질주하는 슈퍼카", duration: 70, path: faster(m, "sportscar", 1.5, 36) },
    { id: "fpv", name: "옥상 레이서", type: "fpv", level: 3, desc: "옥상과 스카이브리지 사이를 꿰는 다른 레이싱 드론", duration: 70, path: gatePath(m, "rooftop", 20) }],
  factory: (m) => [{ id: "bike", name: "오토바이", type: "bike", level: 2, desc: "단지 외곽 도로를 달리는 오토바이", duration: 70, path: faster(m, "truck", 2, 26) },
    { id: "heli", name: "항만 헬기", type: "heli", level: 2, desc: "부두 상공을 크게 도는 헬리콥터", duration: 70, path: ring(0, 0, 120, 42, 16, 20) }],
  canyon: (m) => [{ id: "fpv", name: "협곡 레이서", type: "fpv", level: 3, desc: "바늘귀 협곡을 빠져나가는 레이싱 드론", duration: 70, path: gatePath(m, "slot", 19) }],
  island: (m) => [{ id: "heli", name: "관광 헬기", type: "heli", level: 2, desc: "화산을 한 바퀴 도는 관광 헬리콥터", duration: 75, path: ring(-10, -40, 170, 80, 18, 22) },
    { id: "fpv", name: "정글 레이서", type: "fpv", level: 3, desc: "폭포와 신전 사이를 누비는 레이싱 드론", duration: 70, path: gatePath(m, "jungle", 19) }],
  palace: (m) => [{ id: "fpv", name: "성곽 레이서", type: "fpv", level: 3, desc: "성벽을 따라 도는 레이싱 드론", duration: 70, path: gatePath(m, "rampart", 21) }],
  moon: (m) => [{ id: "ufo", name: "미확인 비행체", type: "skiff", level: 2, desc: "레이더에 잡히지 않는 보랏빛 비행체가 달 기지 둘레를 돈다. 놓치지 말고 화면에 담으세요", duration: 80, path: hover(ring(-20, 0, 185, 0, 20, 16), moonH, 60) },
    { id: "fpv", name: "가속 고리 레이서", type: "fpv", level: 3, desc: "매스 드라이버 고리를 타고 오르는 레이싱 드론", duration: 70, path: gatePath(m, "driver", 22) }],
  empire: (m) => [{ id: "heli", name: "제국 수송기", type: "heli", level: 2, desc: "탑 숲 위를 크게 도는 제국 수송기", duration: 75, path: ring(0, 0, 175, 150, 16, 22) },
    { id: "racer", name: "심장 레이서", type: "fpv", level: 3, desc: "첨탑의 심장실을 꿰뚫는 다른 레이싱 드론", duration: 70, path: gatePath(m, "heart", 21) }],
  airbase: (m) => [{ id: "fpv", name: "관제탑 레이서", type: "fpv", level: 3, desc: "관제실을 감아 돌고 기름 탱크 틈을 빠져나가는 다른 레이싱 드론", duration: 75, path: gatePath(m, "tower", 20) },
    { id: "bike", name: "헌병 오토바이", type: "bike", level: 2, desc: "담장 안 순환 도로를 순찰하는 헌병 오토바이", duration: 70, path: faster(m, "fuel", 2, 24) }],
  arena: (m) => [{ id: "fpv", name: "아레나 레이서", type: "fpv", level: 2, desc: "타워 코스를 도는 다른 레이싱 드론", duration: 70, path: gatePath(m, "towers", 17) }],
};

export function addSubjects(maps) {
  for (const m of maps) {
    const add = ADD[m.id] && ADD[m.id](m);
    if (!add) continue;
    for (const t of add) if (t.path && t.path.length > 2 && !m.tracking.find((x) => x.id === t.id)) m.tracking.push(t);
  }
}
