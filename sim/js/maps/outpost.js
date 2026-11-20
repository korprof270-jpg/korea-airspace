// 맵: 붉은 협곡 전초기지 — 기계제국 에이아가 붉은 사암 협곡에 파 넣은 전진 기지. 인류의 보급로를 끊은 "봉쇄선"
//  · 주 협곡(깊이 30~54 m)이 서 → 동으로 굽이치고, 가운데 북벽에 절벽 요새(계단식 포대 · 격납고 굴 둘 · 안뜰 · 170 m 지휘 첨탑)가 박혀 있다
//  · 협곡을 가로지르는 철골 봉쇄 다리 셋(서 · 가운데 정문 다리 · 동), 바닥의 보급로와 검문소, 암석 아치
//  · 남서: 연합군 고원(전진 기지 터)   · 남동: 시추 메사(시추탑 다섯 · 플레어 스택 · 연료 탱크 단지 · 순환로)
//  · 북서: 포대 메사(대공 포대)와 바늘 협곡   · 북동: 감시 뷰트(기울며 도는 접시 안테나)   · 동쪽 끝: 협곡을 건너는 삭도
//  · 절벽 턱을 깎은 착륙장 둘(서 · 동), 원경은 끝없는 메사와 먼지 회오리, 제국의 먼 탑
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers, trussBridge, searchlights, flames, smoke, rockArch, ROCK, ROCK_D } from "./outpost-kit.js";
import { height, colorFn, canyonPoint, canyonHW, BRIDGES } from "./outpost-terrain.js";
import { fortress, court, spire } from "./outpost-base.js";
import { TRACKS, TRACKING, COMBAT, STRIKE, SUPPLY, SPAWN, BOSS, CONVOY, DEPOTS, PATROL, COURIER, ROAD, RIG_ROAD, PADS } from "./outpost-routes.js";
import { zones } from "./outpost-zones.js";
import { details } from "./outpost-detail.js";
import { sky } from "./outpost-sky.js";

export { height };

const BRIDGE_NAMES = ["서쪽 봉쇄 다리", "정문 다리", "동쪽 봉쇄 다리"];

function build(w) {
  const K = { blink: new Blinkers(w), lights: [], flames: [], smoke: [] };
  w.terrain(height, colorFn, { seg: 300 });
  sky(w, K);

  // ── 비워 둘 곳: 임무 지점, 코스·경로 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 13]), ...STRIKE.turrets.map((p) => [p[0], p[1], 8]), [STRIKE.core[0], STRIKE.core[1], 19], [SUPPLY.depot[0], SUPPLY.depot[1], 13], ...SUPPLY.camps.map((p) => [p[0], p[1], 13]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 8]),
    [COMBAT.blue[0], COMBAT.blue[1], 37], [COMBAT.red[0], COMBAT.red[1], 37], [SPAWN.pos[0], SPAWN.pos[2], 12], [BOSS[0] * 0.6, BOSS[2] * 0.6, 30], ...PADS.map((p) => [p[0], p[1], 7])];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 12);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), true)).concat([sample(PATROL, true), sample(COURIER, true)]);
  for (const t of TRACKS) { const g = t.gates, a = g[g.length - 1].p, b = g[1].p, L = Math.hypot(b[0] - a[0], b[2] - a[2]); KEEP.push([g[0].p[0] - (b[0] - a[0]) / L * 16, g[0].p[2] - (b[2] - a[2]) / L * 16, 10]); }
  const roads = [ROAD, RIG_ROAD.concat([RIG_ROAD[0]])];
  const roadD = (x, z) => { let d = 1e9; for (const R of roads) for (let i = 0; i < R.length - 1; i++) { const a = R[i], b = R[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return d; };
  const taken = [];
  // (x, z) 에 높이 top 까지의 물체를 놓아도 되는가: 임무 지점·도로·이미 놓은 것·코스 선(선보다 9 m 넘게 낮으면 괜찮다)을 피한다
  const free = (x, z, m = 0, top = 1e9) => {
    if (Math.abs(x) > 226 - m || Math.abs(z) > 226 - m) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (roadD(x, z) < 5.5 + m) return false;
    for (const L of LINES) for (const p of L) if (p.y < top + 9 && Math.hypot(x - p.x, z - p.z) < 8 + m) return false;
    return true;
  };
  const cap = (x, z, r) => { let h = Infinity; for (const L of LINES) for (const p of L) if (Math.hypot(x - p.x, z - p.z) < r + 5) h = Math.min(h, p.y - 12); return h; };
  const ctx = { free, cap, taken, KEEP, LINES, roadD };

  // ── 주인공: 절벽 요새 · 안뜰 · 지휘 첨탑 ──
  fortress(w, K); court(w, K); spire(w, K);
  // ── 봉쇄 다리 셋 ──
  BRIDGES.forEach(([x, zs, zn, y], i) => trussBridge(w, K, [x, zs], [x, zn], y, { name: BRIDGE_NAMES[i], portal: i !== 1, width: i === 1 ? 11 : 10 }));
  // ── 암석 아치(주 협곡의 좁은 목 둘) ──
  for (const x of [-92, 97]) {
    const o = canyonHW(x) + 9, a = canyonPoint(x, -o), b = canyonPoint(x, o);
    rockArch(w, a[0], a[1], b[0], b[1], 8, 34, 5.6, ROCK_D);
    const c = canyonPoint(x, 0);
    w.gap("암석 아치 밑", c[0], 15, c[1], 90, 34, 24, 300);
  }

  const t0 = performance.now();
  zones(w, K, ctx);
  details(w, K, ctx);
  searchlights(w, K.lights); flames(w, K.flames); smoke(w, K.smoke);
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "outpost",
  name: "붉은 협곡 전초기지",
  desc: "기계제국이 붉은 사암 협곡에 파 넣은 전진 기지. 절벽에 박힌 계단식 요새와 170 m 지휘 첨탑, 협곡을 틀어막은 철골 다리 셋, 시추탑 숲과 접시 안테나 — 해 질 녘 먼지 속, 붉은 바위 위의 검은 기계",
  size: 230,
  ceiling: 210,
  seed: 4127,
  env: {
    lamps: true, cloud: 0.42, cloudLit: 0xffb070, cloudDark: 0x7a4038, horizonGlow: 0xff8a3a,
    sky: { top: 0x3c4a84, horizon: 0xffa868, bottom: 0xb06a50 }, sunDir: [-0.82, 0.27, 0.5], sunColor: 0xffb478, sun: 3.3, sunDisc: 3,
    hemi: 0.5, hemiSky: 0xc4b4dc, hemiGround: 0x7a4234, toon: { sun: 0.66, fill: 0.34 },
    fog: { color: 0xdc9670, near: 190, far: 1500 }, exposure: 1.02, glow: 2.2, bloom: { strength: 0.42, radius: 0.5, threshold: 0.9 },
    look: { scatter: 0.3 },
  },
  spawn: SPAWN,
  thumb: { pos: [-86, 63, 38], look: [12, 62, -104] },
  build,
  tracks: TRACKS,
  tracking: TRACKING,
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY },
  boss: { pos: BOSS },
};
