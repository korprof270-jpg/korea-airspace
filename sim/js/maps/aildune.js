// 맵: 에일 행성 '어미별' 서쪽 끝 — 「유리 사막」. 답을 듣지 못한 노래가 굳어 유리가 되는 사막
//  · 가운데(북): 공명 숲 — 노래 굳은 기둥(높이 138 m, 자장가 조각이 심에 잠들어 있다)과 거대한 소리굽쇠·오르간 관 결정
//  · 가로지르는 유리 협곡: 서쪽 경계 밖에서 들어와 동쪽 비탈로 끝난다. 결정 다리·쓰러진 결정이 걸려 있다
//  · 북서: 빈 합창의 가시 둥지(가시 탑·둥지 심)   · 북서 끝: 깨진 결정의 프리즘 밭
//  · 남서: 반쯤 묻힌 가오리 순례상과 묻힌 함선 껍데기   · 남동: 오아시스 빛 샘과 순례자 야영지   · 남: 출발 판, 노래꾼 순례상
//  · 하늘: 고리 가스 행성과 두 위성, 사구 위를 건너는 모래 가오리 떼
import * as THREE from "../../vendor/three.module.min.js";
import { Blinkers } from "./ail-kit.js";
import { Veins } from "./aildune-kit.js";
import { height, colorFn, land, FOREST, NEST, PRISM, OASIS, LAKE, SPAWN, RAYST, SINGERS, ROAD, SPUR } from "./aildune-terrain.js";
import { TRACKS, TRACKING, RAYPATH, SKIFF, COMBAT, BOSS, CONVOY, STRIKE, SUPPLY, DEPOTS } from "./aildune-routes.js";
import { forest, canyon } from "./aildune-base.js";
import { zones } from "./aildune-zones.js";
import { sky, farland } from "./aildune-sky.js";
import { life } from "./aildune-life.js";

export { height };

function build(w) {
  w.col.setTerrain(height);
  const K = { blink: new Blinkers(w) }, V = new Veins(w);
  w.terrain(height, colorFn, { flat: "dirt", flatTint: "1.05, 0.98, 1.08", rockTint: "0.8, 0.9, 1.1", rockLo: 0.4, rockHi: 0.7 });
  sky(w);

  // ── 비워 둘 곳: 임무 지점·기지·트랙·길 ──
  const KEEP = [...DEPOTS.map((p) => [p[0], p[1], 12]), ...STRIKE.turrets.map((p) => [p[0], p[1], 7]), [STRIKE.core[0], STRIKE.core[1], 18], [SUPPLY.depot[0], SUPPLY.depot[1], 12], ...SUPPLY.camps.map((p) => [p[0], p[1], 10]), ...SUPPLY.turrets.map((p) => [p[0], p[1], 7]),
    [COMBAT.blue[0], COMBAT.blue[1], 38], [COMBAT.red[0], COMBAT.red[1], 38], [SPAWN.x, SPAWN.z, 24], [BOSS[0] * 0.6, BOSS[2] * 0.6, 30], [BOSS[0], BOSS[2], 25]];
  const sample = (pts, loop) => new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])), loop, "centripetal").getPoints(pts.length * 10);
  const LINES = TRACKS.map((t) => sample(t.gates.map((g) => g.p), t.loop !== false)).concat([sample(RAYPATH, false), sample(SKIFF, true)]);
  const LP = LINES.flat();
  const roadPts = [...ROAD, ...SPUR];
  const road = (x, z, m = 0) => { for (const [qx, qz] of roadPts) if (Math.hypot(x - qx, z - qz) < 8 + m) return false; return true; };
  const taken = [];
  const freeTaken = (x, z, r) => { for (const [fx, fz, fr] of taken) if (Math.hypot(x - fx, z - fz) < fr + r) return false; return true; };
  // low: 낮은 것(트랙 선 검사를 땅 가까이만)
  const free = (x, z, m = 0, low = false) => {
    if (!road(x, z, m)) return false;
    for (const [fx, fz, fr] of KEEP) if (Math.hypot(x - fx, z - fz) < fr + m) return false;
    if (!low && !freeTaken(x, z, m)) return false;
    const gy = height(x, z);
    for (const p of LP) if (p.y - gy < (low ? 4 : 40) && Math.hypot(x - p.x, z - p.z) < (low ? 3 : 9) + m) return false;
    return true;
  };
  // 수평 반경 r, 높이 y0~y1 안에 코스·경로 선이 지나지 않는가
  const clear3 = (x, z, r, y0, y1) => { for (const p of LP) if (p.y > y0 - 4 && p.y < y1 + 4 && Math.hypot(x - p.x, z - p.z) < r + 4) return false; return true; };
  const air = [];
  const freeAir = (x, y, z, m) => {
    for (const p of LP) if (Math.hypot(x - p.x, y - p.y, z - p.z) < m + 6) return false;
    for (const [ax, ay, az, s] of air) if (Math.hypot(x - ax, y - ay, z - az) < m + s) return false;
    return true;
  };
  const t0 = performance.now(), ctx = { free, freeTaken, clear3, freeAir, taken, air, road, KEEP };
  forest(w, K, V, ctx);
  canyon(w, K, V, ctx);
  zones(w, K, V, ctx);
  farland(w);
  life(w, K, ctx);
  V.finish();
  K.blink.finish();
  w.detailMs = Math.round(performance.now() - t0);
}

export default {
  id: "aildune",
  name: "유리 사막",
  desc: "어미별 서쪽 끝, 답을 듣지 못한 노래가 굳어 유리가 되는 사막. 노래 굳은 기둥이 솟은 공명 숲, 결정 다리가 걸린 유리 협곡, 빈 합창의 가시 둥지, 반쯤 묻힌 순례상과 함선 껍데기 사이로 모래 가오리가 건너간다",
  size: 240,
  ceiling: 200,
  seed: 612,
  land,
  env: {
    stars: true, cloud: 0.18, noWind: false, lamps: false,
    sky: { top: 0x2a0f56, horizon: 0xe08a6a, bottom: 0x5a2a6a }, horizonGlow: 0x8a3a6a, cloudLit: 0xffd0b8, cloudDark: 0x7a4a9a,
    sunDir: [-0.62, 0.3, 0.5], sunColor: 0xffe2c0, sun: 3.0, sunDisc: 7,
    hemi: 0.66, hemiSky: 0xc0a0ff, hemiGround: 0x9a5a50, toon: { sun: 0.6, fill: 0.32 },
    fog: { color: 0x9a6a9a, near: 240, far: 1400 }, exposure: 1.0, glow: 2.0, bloom: { strength: 0.4, radius: 0.55, threshold: 0.9 }, look: { scatter: 0.18 },
  },
  spawn: { pos: [SPAWN.x, SPAWN.y + 0.3, SPAWN.z], yaw: 0 },
  thumb: { pos: [70, 60, 40], look: [0, 60, -110] },
  build,
  tracks: TRACKS,
  tracking: TRACKING,
  combat: COMBAT,
  strike: STRIKE,
  supply: SUPPLY,
  convoy: { speed: 7.5, path: CONVOY.map(([x, z]) => [x, 0, z]) },
  boss: { pos: BOSS },
};

void FOREST; void NEST; void PRISM; void OASIS; void LAKE; void RAYST; void SINGERS;
