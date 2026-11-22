// 기체 모델 부품 합치기: 부품마다 따로 그리던 것을 "같은 재질 + 같이 움직이는 부품"끼리 한 덩어리로 묶어
// 그리기 호출을 줄인다 (드론 한 기에 60회 남짓 → 10회 안팎).
// root.userData.anim = 따로 움직이는 노드 목록(프로펠러 허브 등). 이 목록이 없으면 무엇이 움직이는지 몰라 건드리지 않는다.
import * as THREE from "../vendor/three.module.min.js";

const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _n = new THREE.Matrix3(), _v = new THREE.Vector3();

export function mergeStatic(root) {
  const anim = root.userData && root.userData.anim;
  if (!anim) return root;
  const animSet = new Set(anim);
  root.updateMatrixWorld(true);
  // 부품마다 "가장 가까운 움직이는 조상(없으면 root)"을 기준으로 묶는다
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || animSet.has(o) || Array.isArray(o.material) || o.userData.keep) return;
    let base = o.parent;
    while (base && base !== root && !animSet.has(base)) base = base.parent;
    if (!base) return;
    const g = o.geometry;
    if (!g || !g.attributes.position || !g.attributes.normal || g.morphAttributes.position) return;
    const sig = `${base.uuid}|${o.material.uuid}|${g.attributes.uv ? "uv" : ""}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}|${o.renderOrder}|${o.visible ? 1 : 0}`;
    let L = groups.get(sig);
    if (!L) groups.set(sig, (L = { base, mat: o.material, uv: !!g.attributes.uv, list: [] }));
    L.list.push(o);
  });
  for (const G of groups.values()) {
    if (G.list.length < 2) continue;
    _inv.copy(G.base.matrixWorld).invert();
    let nv = 0, ni = 0;
    for (const o of G.list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = G.uv ? new Float32Array(nv * 2) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const o of G.list) {
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      _m.multiplyMatrices(_inv, o.matrixWorld); _n.getNormalMatrix(_m);
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i).applyMatrix4(_m); pos.set([_v.x, _v.y, _v.z], (vo + i) * 3);
        _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize(); nor.set([_v.x, _v.y, _v.z], (vo + i) * 3);
        if (uv) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = vo + g.index.getX(i);
      else for (let i = 0; i < P.count; i++) idx[io++] = vo + i;
      vo += P.count;
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    mg.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    if (uv) mg.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    mg.setIndex(new THREE.BufferAttribute(idx, 1));
    mg.computeBoundingSphere();
    const f = G.list[0], mesh = new THREE.Mesh(mg, G.mat);
    mesh.castShadow = f.castShadow; mesh.receiveShadow = f.receiveShadow; mesh.renderOrder = f.renderOrder;
    G.base.add(mesh);
    for (const o of G.list) o.parent.remove(o);   // 원래 부품은 아직 GPU 에 올라가기 전이라 그냥 뺀다(공유 지오메트리일 수 있어 dispose 하지 않음)
  }
  // 비어 버린 중간 그룹 정리(움직이는 노드는 남긴다)
  const empty = [];
  root.traverse((o) => { if (o !== root && !o.isMesh && !animSet.has(o) && o.children.length === 0 && o.type === "Group") empty.push(o); });
  for (const o of empty) o.parent && o.parent.remove(o);
  return root;
}
