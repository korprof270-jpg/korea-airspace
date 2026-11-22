// 기지전: 미니드론·정글 몬스터를 인스턴싱으로 한꺼번에 그린다 (수십 대가 날아도 그리기 호출 2~3회)
// 전투 시스템에는 빈 Object3D(대리 모델)를 넘기고, 매 프레임 그 위치·자세·크기를 인스턴스 행렬로 옮긴다
import * as THREE from "../../vendor/three.module.min.js";

const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _c = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

// parts: [geo, matrix|null, color][] → 정점 색이 든 하나의 지오메트리 (함대전 swarmwar.js 도 쓴다)
export function merge(parts) {
  let n = 0;
  for (const [g] of parts) n += g.index ? g.index.count : g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), v = new THREE.Vector3(), nm = new THREE.Matrix3(), c = new THREE.Color();
  let o = 0;
  for (const [g, m, color] of parts) {
    const P = g.attributes.position, N = g.attributes.normal, I = g.index, cnt = I ? I.count : P.count;
    c.set(color); if (m) nm.getNormalMatrix(m);
    for (let i = 0; i < cnt; i++, o++) {
      const k = I ? I.getX(i) : i;
      v.fromBufferAttribute(P, k); if (m) v.applyMatrix4(m); pos.set([v.x, v.y, v.z], o * 3);
      v.fromBufferAttribute(N, k); if (m) v.applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], o * 3);
      col.set([c.r, c.g, c.b], o * 3);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}
export const T = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

// 모양: 미니드론(작은 쿼드 드론) / 정글 감시자(가시 돋친 팔면체 + 고리)
const SHAPES = {
  minion() {
    const body = [], glow = [];
    body.push([new THREE.BoxGeometry(0.9, 0.34, 1.3), null, 0x2a3040], [new THREE.BoxGeometry(0.5, 0.2, 0.5), T(0, 0.26, 0.15), 0x4a5468]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      body.push([new THREE.BoxGeometry(0.16, 0.1, 1.15), T(sx * 0.42, 0, sz * 0.42, 1, 1, 1, 0, sx * sz * Math.PI / 4), 0x1c2028]);
      glow.push([new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), T(sx * 0.82, 0.12, sz * 0.82), 0xffffff]);
    }
    glow.push([new THREE.BoxGeometry(0.62, 0.12, 0.2), T(0, 0.05, -0.68), 0xffffff]);
    return { body: merge(body), glow: merge(glow), scale: 1.7 };
  },
  sentinel() {
    const body = [], glow = [];
    body.push([new THREE.OctahedronGeometry(0.9, 0), T(0, 0, 0, 1, 1.3, 1), 0x2a2238]);
    for (let i = 0; i < 4; i++) body.push([new THREE.ConeGeometry(0.18, 0.9, 5), T(Math.cos(i * 1.571) * 0.85, 0, Math.sin(i * 1.571) * 0.85, 1, 1, 1, 0, 0, 0).multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-Math.sin(i * 1.571), 0, Math.cos(i * 1.571)), Math.PI / 2)), 0x3a2e4e]);
    glow.push([new THREE.TorusGeometry(1.25, 0.07, 5, 24), T(0, 0, 0, 1, 1, 1, Math.PI / 2), 0xffffff], [new THREE.SphereGeometry(0.32, 8, 6), T(0, 0.15, -0.72), 0xffffff]);
    return { body: merge(body), glow: merge(glow), scale: 1.6 };
  },
};

export class Swarm {
  // o.test(actor): 그릴지 (기본: 살아 있고 대리 모델이 보일 때), o.k: 추가 배율 (먼 거리 대역 모델용)
  constructor(scene, shape, cap = 160, o = {}) {
    this.test = o.test || ((a) => a.alive && a.model.visible);
    this.kM = o.k ? new THREE.Matrix4().makeScale(o.k, o.k, o.k) : null;
    const sh = SHAPES[shape]();
    this.scale = sh.scale;
    this.body = new THREE.InstancedMesh(sh.body, new THREE.MeshLambertMaterial({ vertexColors: true }), cap);
    this.glow = new THREE.InstancedMesh(sh.glow, new THREE.MeshBasicMaterial({ vertexColors: true }), cap);
    for (const m of [this.body, this.glow]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    this.body.castShadow = true;
    this.cap = cap; this.list = []; this.scene = scene;
  }
  // 전투 시스템에 넘길 대리 모델
  proxy() {
    const o = new THREE.Object3D();
    o.userData.tick = () => {};
    o.scale.setScalar(this.scale);
    return o;
  }
  add(actor, color) { if (this.list.length < this.cap) { this.list.push(actor); actor.swarmColor = color; actor.swarmI = this.list.length - 1; this._col(actor); } }
  remove(actor) {
    const i = this.list.indexOf(actor);
    if (i < 0) return;
    const last = this.list.pop();
    if (last !== actor) { this.list[i] = last; last.swarmI = i; this._col(last); }
    this.body.setMatrixAt(this.list.length, ZERO); this.glow.setMatrixAt(this.list.length, ZERO);
  }
  setColor(actor, color) { actor.swarmColor = color; this._col(actor); }
  _col(a) { _c.setHex(a.swarmColor).multiplyScalar(2.2); this.glow.setColorAt(a.swarmI, _c); if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true; }
  sync() {
    let n = 0;
    for (const a of this.list) {
      const m = a.model;
      if (this.test(a)) { m.updateMatrix(); _m.copy(m.matrix); if (this.kM) _m.multiply(this.kM); }
      else _m.copy(ZERO);
      this.body.setMatrixAt(a.swarmI, _m); this.glow.setMatrixAt(a.swarmI, _m);
      n = Math.max(n, a.swarmI + 1);
    }
    this.body.count = this.glow.count = n;
    this.body.instanceMatrix.needsUpdate = this.glow.instanceMatrix.needsUpdate = true;
    void _s;
  }
  dispose() {
    for (const m of [this.body, this.glow]) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); m.dispose(); }
  }
}
