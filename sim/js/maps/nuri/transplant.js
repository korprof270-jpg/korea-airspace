// 기존 단독 맵을 지역 맵 안 제자리에 옮겨 짓는다 (대리 월드)
//  · 기존 맵의 build(w) 를 그대로 돌리되, w 대신 '대리 월드'를 넘긴다
//  · 대리 월드는 모든 부품을 (ox, oy, oz) 만큼 옮겨 진짜 월드에 넣고, 반경 R 밖 부품은 버린다(핵심 건물만)
//  · 기존 맵의 지형·물·바닥은 짓지 않는다(지역 지형을 쓴다). 높이는 기존 맵 지형 기준 그대로 + oy
import * as THREE from "../../../vendor/three.module.min.js";
import { World } from "../../world.js";
import { rng } from "../../config.js";

const _T = new THREE.Matrix4(), _M = new THREE.Matrix4(), _v = new THREE.Vector3(), _bb = new THREE.Box3();

export function transplant(real, def, ox, oz, o = {}) {
  const R = o.r || 260, cx = o.cx || 0, cz = o.cz || 0;   // 기존 맵 좌표에서 남길 원 (중심 cx,cz 반경 R)
  let heightFn = () => 0;
  const P = Object.create(World.prototype);
  const off = new THREE.Vector3(ox, 0, oz);
  const keep = (x, z, m = 0) => Math.hypot(x - cx, z - cz) < R + m;
  const group = new THREE.Group();
  // 진짜 월드에 넘길 때 쓰는 이동 (oy 는 지형을 안 뒤에 정한다)
  const shift = () => _T.makeTranslation(off.x, off.y, off.z);
  Object.assign(P, {
    def, quality: real.quality, renderer: real.renderer, env: { ...(def.env || {}), glow: real.env.glow }, night: false, rand: rng(def.seed || 1),
    size: def.size || 300, ceiling: real.ceiling, gates: [], gaps: [], updaters: real.updaters, disposables: real.disposables, uWind: real.uWind, time: 0,
    batches: real.batches, shadowBatches: real.shadowBatches, shadowCell: real.shadowCell, shadowR: real.shadowR, chunk: real.chunk, sunDir: real.sunDir,
    scene: { add: (...a) => { for (const x of a) group.add(x); real._toonDirty = true; }, remove: (...a) => group.remove(...a), get fog() { return real.scene.fog; }, get background() { return real.scene.background; }, traverse: (f) => group.traverse(f), children: group.children },
    col: {
      height: (x, z) => heightFn(x, z),
      addBox: (c, h, q, tag) => keep(c.x, c.z, 20) ? real.col.addBox(_v.copy(c).add(off), h, q, tag) : null,
      addSphere: (c, r, tag) => keep(c.x, c.z, 20) ? real.col.addSphere(_v.copy(c).add(off), r, tag) : null,
      addCapsule: (a, b, r, tag) => keep(a.x, a.z, 20) ? real.col.addCapsule(a.clone().add(off), b.clone().add(off), r, tag) : null,
      addDynamic: (h, tag) => real.col.addDynamic(h, tag),
      blocked: (p, r) => real.col.blocked(_v.copy(p).add(off), r),
      setTerrain: () => {}, items: real.col.items, dyn: real.col.dyn,
    },
  });
  P.h = (x, z) => heightFn(x, z);
  P.terrain = (fn) => { heightFn = fn; };
  P.water = () => {}; P.ground = () => {};
  P.gap = () => {};
  P.material = (k) => real.material(k);
  P.rider = (src, boxes, tag) => real.rider(src, boxes, tag);
  // 모든 묶음 부품이 지나는 곳: 위치를 옮기고, 반경 밖이면 버린다
  P._add = (matKey, geo, matrix, color, uvs, grad) => {
    const e = matrix.elements;
    if (!keep(e[12], e[14])) return;
    const gb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
    if (gb) { _bb.copy(gb).applyMatrix4(matrix); if (_bb.max.x - _bb.min.x > R * 2.2 || _bb.max.z - _bb.min.z > R * 2.2) return; }
    _M.multiplyMatrices(shift(), matrix);
    real._add(matKey, geo, _M, color, uvs, grad);
  };
  P._addShadow = () => {};
  // 지형 높이를 먼저 알아야 oy 를 정할 수 있다: build 를 돌리기 전에 terrain 만 먼저 잡도록 한 번 훑지 않고,
  // build 안에서 terrain 이 맨 먼저 불린다는 점을 이용한다(기존 맵 모두 그렇다). 나머지 부품은 그 뒤에 들어온다
  const baseY = o.y ?? 0;
  const origTerrain = P.terrain;
  P.terrain = (fn, ...rest) => { origTerrain(fn, ...rest); off.y = baseY - fn(cx, cz); };
  off.y = baseY;   // 지형 없는 맵(도시): 바닥 0 → baseY
  def.build(P);
  // 직접 넣은 큰 물체(배경 스카이라인·거대 지붕 등)가 반경을 넘으면 뺀다
  const bb = new THREE.Box3(), c3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  for (const ch of [...group.children]) {
    bb.setFromObject(ch); if (bb.isEmpty()) continue;
    bb.getCenter(c3); bb.getSize(s3);
    if (Math.hypot(c3.x - cx, c3.z - cz) > R + 30 || Math.max(s3.x, s3.z) > R * 2.2) group.remove(ch);
  }
  group.position.copy(off);
  real.scene.add(group);
  return { group, offset: off.clone(), height: (x, z) => heightFn(x - off.x, z - off.z) + off.y };
}
