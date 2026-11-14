// 충돌 월드: 박스(회전 가능)·구·캡슐 정적 콜라이더 + 지형 높이 함수
import * as THREE from "../vendor/three.module.min.js";

const CELL = 12;
const _v = new THREE.Vector3();
const _l = new THREE.Vector3();
const _n = new THREE.Vector3();

export class CollisionWorld {
  constructor() {
    this.items = [];
    this.grid = new Map();
    this.stamp = 0;
    this.dyn = [];                 // 움직이는 충돌 상자 (격자 밖, 매 프레임 위치 갱신)
    this.heightFn = () => 0;
    this.hasTerrain = false;
  }

  setTerrain(fn) { this.heightFn = fn; this.hasTerrain = true; }
  height(x, z) { return this.heightFn(x, z); }

  _insert(c, minx, minz, maxx, maxz) {
    c.stamp = 0;
    this.items.push(c);
    const x0 = Math.floor(minx / CELL), x1 = Math.floor(maxx / CELL);
    const z0 = Math.floor(minz / CELL), z1 = Math.floor(maxz / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = ix * 8192 + iz;
      let cell = this.grid.get(k);
      if (!cell) this.grid.set(k, (cell = []));
      cell.push(c);
    }
    return c;
  }

  // 중심 c, 절반 크기 h, 회전 q
  addBox(c, h, q, tag) {
    const quat = q ? q.clone() : new THREE.Quaternion();
    const r = Math.hypot(h.x, h.y, h.z);
    return this._insert({ type: 0, c: c.clone(), h: h.clone(), q: quat, qi: quat.clone().invert(), tag },
      c.x - r, c.z - r, c.x + r, c.z + r);
  }
  // 움직이는 물체용 상자. 위치·자세는 호출자가 c.c / c.q / c.qi 를 갱신하고 c.vel 에 속도를 넣는다
  addDynamic(h, tag) {
    const c = { type: 0, c: new THREE.Vector3(0, -9999, 0), h: h.clone(), q: new THREE.Quaternion(), qi: new THREE.Quaternion(), vel: new THREE.Vector3(), R: h.length(), dyn: true, tag, stamp: 0 };
    this.dyn.push(c);
    return c;
  }
  addSphere(c, r, tag) {
    return this._insert({ type: 1, c: c.clone(), r, tag }, c.x - r, c.z - r, c.x + r, c.z + r);
  }
  addCapsule(a, b, r, tag) {
    const ab = b.clone().sub(a);
    return this._insert({ type: 2, a: a.clone(), ab, len2: Math.max(ab.lengthSq(), 1e-9), r, tag },
      Math.min(a.x, b.x) - r, Math.min(a.z, b.z) - r, Math.max(a.x, b.x) + r, Math.max(a.z, b.z) + r);
  }

  // 점 p 에서 콜라이더 표면까지의 부호 있는 거리. 법선은 _n 에 기록
  _dist(c, p) {
    if (c.type === 1) {
      _n.copy(p).sub(c.c);
      const d = _n.length();
      if (d > 1e-6) _n.multiplyScalar(1 / d); else _n.set(0, 1, 0);
      return d - c.r;
    }
    if (c.type === 2) {
      _v.copy(p).sub(c.a);
      const t = Math.min(1, Math.max(0, _v.dot(c.ab) / c.len2));
      _n.copy(_v).addScaledVector(c.ab, -t);
      const d = _n.length();
      if (d > 1e-6) _n.multiplyScalar(1 / d); else _n.set(0, 1, 0);
      return d - c.r;
    }
    _l.copy(p).sub(c.c).applyQuaternion(c.qi);
    const h = c.h;
    const dx = Math.abs(_l.x) - h.x, dy = Math.abs(_l.y) - h.y, dz = Math.abs(_l.z) - h.z;
    let d;
    if (dx <= 0 && dy <= 0 && dz <= 0) {
      // 내부: 가장 얕은 축으로 밀어냄
      if (dx > dy && dx > dz) { _n.set(Math.sign(_l.x) || 1, 0, 0); d = dx; }
      else if (dy > dz) { _n.set(0, Math.sign(_l.y) || 1, 0); d = dy; }
      else { _n.set(0, 0, Math.sign(_l.z) || 1); d = dz; }
    } else {
      _n.set(dx > 0 ? Math.sign(_l.x) * dx : 0, dy > 0 ? Math.sign(_l.y) * dy : 0, dz > 0 ? Math.sign(_l.z) * dz : 0);
      d = _n.length();
      _n.multiplyScalar(1 / d);
    }
    _n.applyQuaternion(c.q);
    return d;
  }

  // 반경 r 구가 겹치는 가장 깊은 충돌을 out{depth, normal, collider} 에 기록. 겹치면 true
  querySphere(p, r, out) {
    let best = 0, hit = false;
    const gy = this.heightFn(p.x, p.z);
    if (p.y - r < gy) {
      best = gy - (p.y - r);
      hit = true;
      if (this.hasTerrain) {
        const e = 0.6;
        out.normal.set(this.heightFn(p.x - e, p.z) - this.heightFn(p.x + e, p.z), 2 * e,
          this.heightFn(p.x, p.z - e) - this.heightFn(p.x, p.z + e)).normalize();
      } else out.normal.set(0, 1, 0);
      out.collider = null;
    }
    const st = ++this.stamp;
    const x0 = Math.floor((p.x - r) / CELL), x1 = Math.floor((p.x + r) / CELL);
    const z0 = Math.floor((p.z - r) / CELL), z1 = Math.floor((p.z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const cell = this.grid.get(ix * 8192 + iz);
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const c = cell[i];
        if (c.stamp === st || c.off) continue;
        c.stamp = st;
        const d = this._dist(c, p);
        if (r - d > best) { best = r - d; hit = true; out.normal.copy(_n); out.collider = c; }
      }
    }
    for (let i = 0; i < this.dyn.length; i++) {
      const c = this.dyn[i];
      if (c.off || p.distanceToSquared(c.c) > (c.R + r) * (c.R + r)) continue;
      const d = this._dist(c, p);
      if (r - d > best) { best = r - d; hit = true; out.normal.copy(_n); out.collider = c; }
    }
    out.depth = best;
    return hit;
  }

  // 점 p (여유 r) 가 막혀 있는지
  blocked(p, r = 0) {
    if (p.y - r < this.heightFn(p.x, p.z)) return true;
    const x0 = Math.floor((p.x - r) / CELL), x1 = Math.floor((p.x + r) / CELL);
    const z0 = Math.floor((p.z - r) / CELL), z1 = Math.floor((p.z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const cell = this.grid.get(ix * 8192 + iz);
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) if (!cell[i].off && this._dist(cell[i], p) < r) return true;
    }
    for (let i = 0; i < this.dyn.length; i++) {
      const c = this.dyn[i];
      if (!c.off && p.distanceToSquared(c.c) < (c.R + r) * (c.R + r) && this._dist(c, p) < r) return true;
    }
    return false;
  }

  // 가장 가까운 표면까지의 거리 (maxR 이내만 탐색, 없으면 maxR)
  nearest(p, maxR) {
    let best = Math.min(maxR, p.y - this.heightFn(p.x, p.z));
    const x0 = Math.floor((p.x - maxR) / CELL), x1 = Math.floor((p.x + maxR) / CELL);
    const z0 = Math.floor((p.z - maxR) / CELL), z1 = Math.floor((p.z + maxR) / CELL);
    const st = ++this.stamp;
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const cell = this.grid.get(ix * 8192 + iz);
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const c = cell[i];
        if (c.stamp === st || c.off) continue;
        c.stamp = st;
        const d = this._dist(c, p);
        if (d < best) best = d;
      }
    }
    for (let i = 0; i < this.dyn.length; i++) {
      const c = this.dyn[i];
      if (c.off || p.distanceToSquared(c.c) > (c.R + maxR) * (c.R + maxR)) continue;
      const d = this._dist(c, p);
      if (d < best) best = d;
    }
    return best;
  }

  // 광선을 따라가며 처음 막히는 거리. 안 막히면 -1
  raycast(o, dir, maxD, step = 0.6, r = 0.05) {
    for (let d = step; d <= maxD; d += step) {
      _v.copy(o).addScaledVector(dir, d);
      // _dist 가 _v 를 덮어쓰지 않도록 별도 벡터 사용
      _ray.copy(_v);
      if (this.blocked(_ray, r)) return d;
    }
    return -1;
  }

  // a 에서 b 가 보이는지 (시야 가림 판정)
  visible(a, b, step = 1.2) {
    _dir.copy(b).sub(a);
    const len = _dir.length();
    if (len < step) return true;
    _dir.multiplyScalar(1 / len);
    return this.raycast(a, _dir, len - step, step, 0.05) < 0;
  }
}

const _ray = new THREE.Vector3();
const _dir = new THREE.Vector3();
