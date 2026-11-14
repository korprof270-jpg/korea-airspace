// 월드 빌더: 정적 지오메트리를 재질별로 하나의 메시로 합치고, 충돌체·하늘·조명·게이트를 만든다
import * as THREE from "../vendor/three.module.min.js";
import { CollisionWorld } from "./collide.js";
import { rng } from "./config.js";
import { texSet, patternSet, hasTex } from "./textures.js";
import { makeSky, bakeSky, makeWater, linkWaterShore, makeTerrainMaterial, HeightField } from "./env.js";
import { toonMat, toonify } from "./toon.js";

const DEG = Math.PI / 180;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _n3 = new THREE.Matrix3();
const Y = new THREE.Vector3(0, 1, 0);
const _rm = new THREE.Matrix4(), _rp = new THREE.Vector3(), _rq = new THREE.Quaternion(), _rs = new THREE.Vector3();

// ── 지오메트리 템플릿 ─────────────────────────────────────
const GEO = {};
function tmpl(key, make) {
  if (!GEO[key]) { const g = (GEO[key] = make()); g.computeBoundingBox(); }
  return GEO[key];
}
const boxG = () => tmpl("box", () => new THREE.BoxGeometry(1, 1, 1));
const cylG = (rt) => tmpl("cyl" + rt, () => new THREE.CylinderGeometry(rt, 1, 1, 20));
const tubeG = () => tmpl("tube", () => new THREE.CylinderGeometry(1, 1, 1, 20, 1, true));
const coneG = () => tmpl("cone", () => new THREE.ConeGeometry(1, 1, 12));
const sphG = () => tmpl("sph", () => new THREE.SphereGeometry(1, 24, 14));
const planeG = () => tmpl("plane", () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; });
// 울퉁불퉁한 덩어리(나뭇잎·바위)
const blobG = (k) => tmpl("blob" + k, () => {
  const g = new THREE.IcosahedronGeometry(1, 2), P = g.attributes.position, r = rng(90 + k);
  const off = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < P.count; i++) {
    _v.fromBufferAttribute(P, i);
    const n = Math.sin(_v.x * 3.1 + off[0]) * Math.sin(_v.y * 3.7 + off[1]) * Math.sin(_v.z * 3.3 + off[2]);
    _v.multiplyScalar(1 + n * 0.24 + Math.sin(_v.y * 7 + off[0]) * 0.05);
    P.setXYZ(i, _v.x, _v.y, _v.z);
  }
  // 면 법선과 구 법선을 섞어 부드러우면서도 덩어리감 있는 음영을 만든다
  g.computeVertexNormals();
  const N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).normalize().lerp(_p.fromBufferAttribute(N, i), 0.35).normalize(); N.setXYZ(i, _v.x, _v.y, _v.z); }
  return g;
});

class Batch {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.uv = []; this.idx = []; this.count = 0; }
}

export class World {
  constructor(def, quality = "med", renderer = null) {
    this.def = def;
    this.quality = quality;
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.col = new CollisionWorld();
    this.batches = new Map();
    this.size = def.size || 300;      // 맵 반경(절반 크기)
    this.ceiling = def.ceiling || 160;
    this.gates = [];
    this.gaps = [];                   // 프리스타일 통과 보너스 지점
    this.updaters = [];               // 매 프레임 갱신할 동적 소품
    this.disposables = [];
    this.rand = rng(def.seed || 1);
    this.time = 0;
    this.uWind = { value: 0 };
    this.env = def.env || {};
    this.night = !!this.env.night;
    // 블룸은 네온·발광체에만 은은하게. outline: 외곽선 잉크(밤 맵은 어두운 면 위에서 밝게 보이는 달빛 선)
    this.bloom = Object.assign({ strength: this.night ? 0.55 : 0.24, radius: 0.55, threshold: this.night ? 0.86 : 1.0 }, this.env.bloom || {});
    this.bloom.outline = this.env.outline || (this.night ? { color: 0x1c2a66, mul: 0.4 } : null);
    this.exposure = this.env.exposure ?? 1;
    this._env(this.env);
    // 화면 공간 음영·대기 산란 설정 (post.js LOOK). 밤 맵은 산란을 줄이고 음영을 남색으로
    const sunC = new THREE.Color(this.env.sunColor ?? 0xfff3d6).multiplyScalar(this.night ? 0.25 : 1);
    this.bloom.look = Object.assign({ sunDir: this.sunDir, sunColor: sunC, haze: Math.max(160, (this.env.fog && this.env.fog.far || 900) * 0.4), aoTint: this.night ? 0x2a2c5c : 0x4f5480, ao: this.night ? 0.45 : 0.55 }, this.env.look || {});
    // 맵·모드가 장면에 직접 넣는 물체도 툰 재질로 맞춘다 (update 에서 한 번씩 변환)
    const sc = this.scene, add = sc.add.bind(sc);
    sc.add = (...objs) => { this._toonDirty = true; return add(...objs); };
    def.build(this);
    this._finalize();
  }

  h(x, z) { return this.col.height(x, z); }

  // ── 환경(하늘·조명·안개) ──
  _env(e) {
    const sc = this.scene;
    const sky = makeSky(e);
    this.sunDir = sky.material.uniforms.sunDir.value.clone();
    const hor = sky.material.uniforms.hor.value.clone();
    if (this.renderer) this.skyBake = bakeSky(this.renderer, sky, this.quality === "high" ? 2048 : 1024);
    sky.geometry.dispose(); sky.material.dispose();
    this.envI = e.envIntensity ?? 1;
    const fog = e.fog || {};
    sc.fog = new THREE.Fog(fog.color ?? hor.getHex(), fog.near ?? 120, fog.far ?? 900);
    sc.background = this.skyBake ? this.skyBake.cube.texture : new THREE.Color(fog.color ?? hor.getHex());

    // 툰 조명: 그림자 밴드는 반구광만 받으므로, 예전에 하늘 반사(IBL)가 채우던 몫을 반구광에 얹는다.
    // 맵 env 의 sun/hemi 값은 그대로 쓰고 배율만 여기서 맞춘다 (env.toon = { sun, fill, hemi } 로 맵별 조정 가능)
    const tn = Object.assign(this.night ? { sun: 1.0, fill: 0.9, hemi: 1 } : { sun: 0.5, fill: 0.5, hemi: 1 }, e.toon || {});
    const sunI = e.sun ?? 3.2;
    sc.add(new THREE.HemisphereLight(e.hemiSky ?? 0xcfe3ff, e.hemiGround ?? 0x6b6455, (e.hemi ?? 0.45) * tn.hemi + sunI * tn.fill));
    const sun = new THREE.DirectionalLight(e.sunColor ?? 0xfff3d6, sunI * tn.sun);
    sun.position.copy(this.sunDir).multiplyScalar(200);
    sc.add(sun, sun.target);
    this.sun = sun;
    if (this.quality !== "low" && !e.noShadow) {
      sun.castShadow = true;
      const s = sun.shadow, hi = this.quality === "high", R = hi ? 110 : 85;
      s.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048);
      s.camera.left = -R; s.camera.right = R; s.camera.top = R; s.camera.bottom = -R;
      s.camera.near = 10; s.camera.far = 600;
      s.bias = -0.0004; s.normalBias = 0.06; s.radius = 2.5;
      this.shadowR = R; this.shadowRes = s.mapSize.x;
    }
  }

  // 그림자·하늘을 카메라에 맞춰 이동 (그림자 떨림을 줄이려 텍셀 단위로 스냅)
  follow(cam, focus) {
    let fx = focus.x, fy = focus.y, fz = focus.z;
    if (this.shadowR) { const t = (this.shadowR * 2) / this.shadowRes * 4; fx = Math.round(fx / t) * t; fy = Math.round(fy / t) * t; fz = Math.round(fz / t) * t; }
    this.sun.target.position.set(fx, fy, fz);
    this.sun.position.set(fx, fy, fz).addScaledVector(this.sunDir, 260);
  }

  update(dt) {
    this.time += dt;
    this.uWind.value = this.time;
    if (this.waterMesh) this.waterMesh.material.uniforms.time.value = this.time;
    if (this._toonDirty) this._toonify();
    for (const u of this.updaters) u(dt, this.time);
    this._riders(dt);
  }

  // 움직이는 물체에 충돌 상자를 붙인다. src: Object3D 또는 [InstancedMesh, 인스턴스 번호]
  // boxes: [[cx, cy, cz, hx, hy, hz], ...] (물체 로컬 좌표의 중심과 절반 크기)
  rider(src, boxes, tag = "mover") {
    const list = this.riders || (this.riders = []);
    for (const b of boxes) list.push({ src, off: new THREE.Vector3(b[0], b[1], b[2]), c: this.col.addDynamic(new THREE.Vector3(b[3], b[4], b[5]), tag), first: true });
  }

  _riders(dt) {
    if (!this.riders) return;
    let last = null;
    for (const r of this.riders) {
      if (r.src !== last) {
        last = r.src;
        if (Array.isArray(r.src)) { r.src[0].getMatrixAt(r.src[1], _rm); _rm.premultiply(r.src[0].matrixWorld); }
        else { r.src.updateWorldMatrix(true, false); _rm.copy(r.src.matrixWorld); }
        _rm.decompose(_rp, _rq, _rs);
      }
      const c = r.c;
      _v.copy(r.off).multiply(_rs).applyQuaternion(_rq).add(_rp);
      if (r.first || dt <= 0) { c.vel.set(0, 0, 0); r.first = false; }
      else { c.vel.copy(_v).sub(c.c).multiplyScalar(1 / dt); if (c.vel.lengthSq() > 6400) c.vel.set(0, 0, 0); }   // 순간 이동(경로 되감기)은 속도 0
      c.c.copy(_v); c.q.copy(_rq); c.qi.copy(_rq).invert();
      c.off = Array.isArray(r.src) ? false : !r.src.visible;
    }
  }

  // 장면에 새로 들어온 물체(포탑·화물·차량 등)의 PBR/램버트 재질을 툰 재질로 교체
  _toonify() {
    this._toonDirty = false;
    for (const o of this.scene.children) if (!o.userData.toonDone) { o.userData.toonDone = true; toonify(o); }
  }

  // ── 재질 (모두 툰 밴드 조명. 텍스처는 색 맵만 쓴다) ──
  // 맵의 움직이는 소품이 같은 재질을 쓰도록 공개
  material(key) { return this._material(key); }

  _material(key) {
    const [kind, tex] = key.split(":");
    const t = tex ? (hasTex(tex) ? texSet(tex) : patternSet(tex)) : null;
    const std = (o) => toonMat(Object.assign({ vertexColors: true }, t ? { map: t.map } : null, o));
    switch (kind) {
      case "leaf": return std({});
      case "foliage": {   // 나뭇잎: 바람에 살랑인다 (실내·진공 맵은 env.noWind)
        if (this.env.noWind) return std({});
        const uWind = this.uWind;
        return std({ key: "leaf-wind", extend(sh) {
          sh.uniforms.uWind = uWind;
          sh.vertexShader = "uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
            float wp = uWind * 1.5 + position.x * 0.33 + position.z * 0.27;
            transformed.x += sin( wp ) * 0.11 + sin( wp * 2.3 + position.y ) * 0.04;
            transformed.z += cos( wp * 0.8 ) * 0.09;
            transformed.y += sin( wp * 1.7 + position.x ) * 0.03;`);
        } });
      }
      case "flat": return std({ flat: true });
      case "metal": return std({ spec: 0.7, shine: 40, metal: true });
      case "paint": return std({ spec: 0.35, shine: 70 });
      case "glow": { const k = this.env.glow ?? 2.4; return new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(k, k, k), map: t ? t.map : null }); }
      case "glass": return std({ transparent: true, opacity: 0.42, depthWrite: false, spec: 1, shine: 120 });
      case "lit": return std({ emissiveMap: t.emissiveMap, emissive: new THREE.Color().setScalar(this.env.windowGlow ?? 0.95) });
      case "pool": return new THREE.MeshBasicMaterial({ vertexColors: true, map: patternSet("radial").map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      case "shaft": return new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      default: return std({});
    }
  }

  // 템플릿 지오메트리를 변환해 재질 배치에 추가
  // uvs: 박스 면별 UV 배율 [sx,sy,sz]/타일 또는 [su, sv]. grad: [아래, 위] 밝기(높이 그라디언트·접지 음영)
  _add(matKey, geo, matrix, color, uvs, grad) {
    let b = this.batches.get(matKey);
    if (!b) this.batches.set(matKey, (b = new Batch()));
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
    _n3.getNormalMatrix(matrix);
    _c.set(color);
    const base = b.count;
    const bb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox), y0 = bb.min.y, yr = Math.max(1e-6, bb.max.y - bb.min.y);
    for (let i = 0; i < P.count; i++) {
      const ly = P.getY(i);
      _v.fromBufferAttribute(P, i).applyMatrix4(matrix);
      b.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize();
      b.nor.push(_v.x, _v.y, _v.z);
      const k = grad ? grad[0] + (grad[1] - grad[0]) * ((ly - y0) / yr) : 1;
      b.col.push(_c.r * k, _c.g * k, _c.b * k);
      let u = U ? U.getX(i) : 0, v = U ? U.getY(i) : 0;
      if (uvs) {
        if (uvs.length === 2) { u *= uvs[0]; v *= uvs[1]; }
        else {
          const f = (i / 4) | 0; // 박스 면: +x,-x,+y,-y,+z,-z
          if (f < 2) { u *= uvs[2]; v *= uvs[1]; } else if (f < 4) { u *= uvs[0]; v *= uvs[2]; } else { u *= uvs[0]; v *= uvs[1]; }
        }
      }
      b.uv.push(u, v);
    }
    const I = geo.index;
    if (I) for (let i = 0; i < I.count; i++) b.idx.push(base + I.getX(i));
    else for (let i = 0; i < P.count; i++) b.idx.push(base + i);
    b.count += P.count;
  }

  _finalize() {
    for (const [key, b] of this.batches) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx);
      const mat = this._material(key);
      const mesh = new THREE.Mesh(g, mat);
      const kind = key.split(":")[0];
      const fxk = kind === "glow" || kind === "pool" || kind === "shaft";
      mesh.castShadow = !fxk && kind !== "glass" && kind !== "shell";
      mesh.receiveShadow = !fxk;
      if (kind === "glass") mesh.renderOrder = 5;
      if (kind === "pool") mesh.renderOrder = 2;
      if (kind === "shaft") mesh.renderOrder = 6;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.disposables.push(g, mat);
    }
    this.batches.clear();
    // 지형과 수면이 함께 있으면 물가 거품을 그릴 수 있게 높이를 넘긴다
    if (this.waterMesh && this.heightField) this.disposables.push(linkWaterShore(this.waterMesh, this.heightField, this.waterY));
    this._toonify();
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
    const shared = new Set(Object.values(GEO));
    this.scene.traverse((o) => {
      if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    if (this.skyBake) this.skyBake.cube.dispose();
  }

  // ── 기본 도형 (y 는 바닥 높이) ──
  // o: { ry, rx, rz (도), mat, tile(m), col(충돌, 기본 true), ao(접지 음영, 기본 켬), tag }
  box(x, y, z, sx, sy, sz, color = 0x888888, o = {}) {
    _e.set((o.rx || 0) * DEG, (o.ry || 0) * DEG, (o.rz || 0) * DEG, "YXZ");
    _q.setFromEuler(_e);
    _p.set(x, y + sy / 2, z);
    _m.compose(_p, _q, _s.set(sx, sy, sz));
    const mat = o.mat || "std";
    const tile = o.tile || (mat.includes(":") ? 4 : 0);
    const fx = mat.startsWith("glow") || mat.startsWith("glass");
    const grad = o.ao === false || fx || sy < 0.6 ? null : [Math.max(0.55, 1 - Math.min(sy, 12) * 0.03 - 0.12), 1.04];
    this._add(mat, boxG(), _m, color, tile ? [sx / tile, sy / tile, sz / tile] : null, grad);
    if (o.col !== false) return this.col.addBox(_p, _s.set(sx / 2, sy / 2, sz / 2), _q, o.tag);
    return null;
  }

  cyl(x, y, z, r, h, color = 0x888888, o = {}) {
    const rt = o.rt === undefined ? 1 : o.rt / r;
    _m.compose(_p.set(x, y + h / 2, z), _q.identity(), _s.set(r, h, r));
    const mat = o.mat || "std", fx = mat.startsWith("glow") || mat.startsWith("glass");
    const tile = o.tile || (mat.includes(":") ? 4 : 0);
    this._add(mat, cylG(Math.round(rt * 100) / 100), _m, color, tile ? [(r * 6.28) / tile, h / tile] : null, fx || o.ao === false || h < 0.6 ? null : [0.74, 1.03]);
    if (o.col !== false) {
      const rr = Math.max(r, o.rt ?? r);
      if (h > rr * 2) this.col.addCapsule(new THREE.Vector3(x, y + rr, z), new THREE.Vector3(x, y + h - rr, z), rr, o.tag);
      else this.col.addBox(_p.set(x, y + h / 2, z), _s.set(rr * 0.8, h / 2, rr * 0.8), null, o.tag);
    }
  }

  // 두 점을 잇는 원통(파이프·기둥) + 캡슐 충돌체
  pipe(ax, ay, az, bx, by, bz, r, color = 0x888888, o = {}) {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const d = b.clone().sub(a), len = d.length();
    _q.setFromUnitVectors(Y, d.clone().normalize());
    _m.compose(a.clone().add(b).multiplyScalar(0.5), _q, _s.set(r, len, r));
    this._add(o.mat || "paint", cylG(1), _m, color);
    if (o.col !== false) this.col.addCapsule(a, b, r, o.tag);
  }

  sph(x, y, z, r, color = 0x888888, o = {}) {
    _m.compose(_p.set(x, y, z), _q.identity(), _s.set(r, r * (o.sy || 1), r));
    const mat = o.mat || "std";
    this._add(mat, sphG(), _m, color, null, mat.startsWith("glow") ? null : [0.7, 1.05]);
    if (o.col !== false) this.col.addSphere(_p, r * Math.min(1, o.sy || 1), o.tag);
  }

  cone(x, y, z, r, h, color = 0x888888, o = {}) {
    _m.compose(_p.set(x, y + h / 2, z), _q.identity(), _s.set(r, h, r));
    this._add(o.mat || "leaf", coneG(), _m, color, null, o.grad || [0.62, 1.08]);
    if (o.col !== false) {
      this.col.addSphere(new THREE.Vector3(x, y + h * 0.25, z), r * 0.7, o.tag);
      this.col.addSphere(new THREE.Vector3(x, y + h * 0.6, z), r * 0.4, o.tag);
    }
  }

  // 울퉁불퉁한 덩어리(바위·수관). 반경 rx,ry,rz
  blob(x, y, z, rx, ry, rz, color, o = {}) {
    _e.set(0, (o.ry ?? this.rand() * 360) * DEG, 0);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(rx, ry, rz));
    this._add(o.mat || "leaf", blobG(o.k ?? ((this.rand() * 3) | 0)), _m, color, o.mat && o.mat.includes(":") ? [rx / 3, ry / 3] : null, o.grad || [0.5, 1.12]);
    if (o.col !== false) this.col.addSphere(_p, Math.min(rx, ry, rz) * 0.9, o.tag);
  }

  // 임의 지오메트리를 정적 배치에 추가
  mesh(geo, matrix, color, mat = "std") { geo.computeBoundingBox(); this._add(mat, geo, matrix, color); }

  // 바닥에 깔리는 조명 웅덩이(가산 혼합)
  pool(x, y, z, r, color = 0xffd9a0, k = 0.5) {
    _c.set(color).multiplyScalar(k);
    _m.compose(_p.set(x, y + 0.05, z), _q.identity(), _s.set(r * 2, 1, r * 2));
    this._add("pool", planeG(), _m, _c.clone());
  }

  // 위에서 아래로 퍼지는 빛줄기
  shaft(x, y, z, rTop, rBottom, h, color = 0xffd9a0, k = 0.12) {
    _c.set(color).multiplyScalar(k);
    _m.compose(_p.set(x, y - h / 2, z), _q.identity(), _s.set(rBottom, h, rBottom));
    void rTop;
    this._add("shaft", tmpl("shaftcone", () => new THREE.CylinderGeometry(0.12, 1, 1, 16, 1, true)), _m, _c.clone(), null, [0.0, 1.0]);
  }

  // ── 바닥 / 지형 ──
  // 큰 얼룩(정점 색)과 세부 텍스처를 겹쳐 반복 무늬를 줄인다
  ground(color = 0x5c8a3c, tex = "grass", tile = 8, o = {}) {
    const S = this.size * 2 + 1400, seg = 90;
    const B = o.bounds || [-S / 2, S / 2, -S / 2, S / 2];   // [x0, x1, z0, z1]
    const t = texSet(tex);
    const mat = toonMat({ vertexColors: true, map: t.map });
    const g = new THREE.PlaneGeometry(B[1] - B[0], B[3] - B[2], seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate((B[0] + B[1]) / 2, 0, (B[2] + B[3]) / 2);
    const P = g.attributes.position, U = g.attributes.uv, col = new Float32Array(P.count * 3);
    _c.set(color);
    const var_ = o.vary ?? 0.16;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const n = Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 + 0.4) + 0.5 * Math.sin(x * 0.047 + z * 0.039);
      const k = 1 + n * var_;
      col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k;
      U.setXY(i, x / tile, z / tile);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    this.scene.add(m);
    this.disposables.push(g, mat);
  }

  // 높이 함수 fn(x,z) 로 지형 생성. colorFn(x, y, z, slope) → 큰 얼룩 색
  terrain(fn, colorFn, o = {}) {
    const half = this.size + 260, seg = o.seg || (this.quality === "low" ? 200 : 300);
    const hf = new HeightField(fn, half, seg);
    const g = new THREE.PlaneGeometry(half * 2, half * 2, seg, seg);
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, hf.data[i]);
    g.computeVertexNormals();
    const N = g.attributes.normal, col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      _c.set(colorFn(P.getX(i), P.getY(i), P.getZ(i), 1 - N.getY(i)));
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = makeTerrainMaterial(o);
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.castShadow = true;
    this.scene.add(m);
    this.disposables.push(g, mat);
    this.col.setTerrain((x, z) => hf.at(x, z));
    this.heightField = hf;
  }

  water(y, color = 0x1f5f7a) {
    this.waterMesh = makeWater(this.size * 2 + 1400, y, this.env, color);
    this.scene.add(this.waterMesh);
    this.disposables.push(this.waterMesh.geometry, this.waterMesh.material);
    this.waterY = y;
  }

  // ── 소품 ──
  tree(x, z, s = 1, kind = "round") {
    const y = this.h(x, z) - 0.25, r = this.rand;
    if (kind === "pine") {
      const h = (9 + r() * 6) * s, g = new THREE.Color().setHSL(0.38 + r() * 0.05, 0.5, 0.2 + r() * 0.05).getHex();
      this.cyl(x, y, z, 0.3 * s, h * 0.5, 0x4a3524, { col: false, rt: 0.16 * s });
      this.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h * 0.9, z), 0.4 * s);
      const tiers = 5;
      for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1), rr = (2.6 - t * 1.9) * s * (0.9 + r() * 0.2), hh = h * (0.34 - t * 0.1);
        this.cone(x, y + h * (0.16 + t * 0.6), z, rr, hh, g, { col: i === 1, mat: "foliage" });
      }
    } else if (kind === "bush") {
      const g = new THREE.Color().setHSL(0.26 + r() * 0.08, 0.55, 0.25 + r() * 0.07).getHex();
      for (let i = 0; i < 3; i++) this.blob(x + (r() - 0.5) * s, y + 0.5 * s, z + (r() - 0.5) * s, (0.8 + r() * 0.5) * s, (0.6 + r() * 0.3) * s, (0.8 + r() * 0.5) * s, g, { col: i === 0, mat: "foliage" });
    } else {
      const h = (3.4 + r() * 2.4) * s, cr = (2.3 + r() * 1.2) * s;
      const base = new THREE.Color().setHSL(0.25 + r() * 0.1, 0.6, 0.27 + r() * 0.08);
      this.cyl(x, y, z, 0.3 * s, h + cr * 0.5, 0x4b3624, { rt: 0.17 * s });
      const n = 4 + ((r() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r(), d = i === 0 ? 0 : cr * (0.35 + r() * 0.3), br = cr * (i === 0 ? 0.85 : 0.5 + r() * 0.25);
        _c.copy(base).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.05);
        this.blob(x + Math.cos(a) * d, y + h + cr * (i === 0 ? 0.55 : 0.25 + r() * 0.35), z + Math.sin(a) * d, br, br * 0.82, br, _c.getHex(), { col: i === 0, mat: "foliage" });
      }
    }
  }

  rock(x, z, s = 1, color = 0x8a847a) {
    const y = this.h(x, z), r = this.rand;
    this.blob(x, y + s * 0.25, z, s * (0.8 + r() * 0.5), s * (0.5 + r() * 0.35), s * (0.8 + r() * 0.5), color, { mat: "std:rock", grad: [0.6, 1.08] });
  }

  // 가로등: 기둥 + 발광 헤드 (+ 밤에는 바닥 조명과 빛줄기)
  lamp(x, z, h = 7, color = 0xffe2a8, ry = 0, arm = 1.6) {
    const y = this.h(x, z);
    this.cyl(x, y, z, 0.1, h, 0x2c3138, { mat: "paint", rt: 0.07 });
    const dx = Math.sin(ry * DEG) * arm, dz = Math.cos(ry * DEG) * arm;
    this.pipe(x, y + h - 0.05, z, x + dx, y + h + 0.1, z + dz, 0.05, 0x2c3138, { col: false });
    this.box(x + dx, y + h - 0.02, z + dz, 0.6, 0.1, 0.34, color, { mat: "glow", col: false, ry });
    if (this.night || this.env.lamps) {
      this.pool(x + dx, y, z + dz, h * 1.3, color, 0.5);
      this.shaft(x + dx, y + h, z + dz, 0.2, h * 0.42, h, color, 0.022);
    }
  }

  // 화물 컨테이너 (12.2 x 2.6 x 2.44 m)
  container(x, y, z, ry = 0, color = 0xb5452f, len = 12.2) {
    return this.box(x, y, z, len, 2.6, 2.44, color, { ry, mat: "std:corrug", tile: 2 });
  }

  // 창문이 있는 건물. 밤 맵에서는 창문이 빛난다
  building(x, z, w, d, h, color = 0x9aa3b2, o = {}) {
    const y = this.h(x, z), ry = o.ry || 0, r = this.rand;
    this.box(x, y, z, w, h, d, color, { ry, mat: this.night ? "lit:facadelit" : "std:facade", tile: 24, ao: false });
    this.box(x, y, z, w + 0.5, 3.6, d + 0.5, 0x2a2e36, { ry, col: false, mat: "std:concrete", tile: 6 });   // 저층부
    this.box(x, y + h, z, w + 0.6, 0.7, d + 0.6, 0x343943, { ry, col: false });                              // 옥상 난간
    if (o.roof !== false && !ry) {
      // 옥상 설비
      for (let i = 0; i < 3; i++) {
        const sx = 2 + r() * 3, sz = 2 + r() * 3;
        this.box(x + (r() - 0.5) * (w - sx - 2), y + h + 0.7, z + (r() - 0.5) * (d - sz - 2), sx, 1.2 + r() * 1.6, sz, 0x5a616c, { mat: "std:panel", tile: 3 });
      }
    }
  }

  // 낮은 벽·울타리 a→b
  wall(ax, az, bx, bz, h = 1, t = 0.25, color = 0x9c9c9c, o = {}) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const y = Math.min(this.h(ax, az), this.h(bx, bz));
    this.box((ax + bx) / 2, o.y ?? y, (az + bz) / 2, len, h, t, color, { ry: Math.atan2(-dz, dx) / DEG, ...o });
  }

  // 프리스타일 갭(통과 보너스): 양방향 통과 인정
  gap(name, x, y, z, yaw, w, h, pts = 300, pitch = 0) {
    _e.set(pitch * DEG, yaw * DEG, 0, "YXZ");
    const q = new THREE.Quaternion().setFromEuler(_e);
    this.gaps.push({ name, pos: new THREE.Vector3(x, y, z), q, qi: q.clone().invert(), w, h, pts, cool: 0 });
  }
}

// ── 게이트 ─────────────────────────────────────────────────
const GATE_COLORS = { idle: 0xff6a12, next: 0x25ff6a, after: 0x1f9bff, done: 0x3a3f48 };
const GATE_POWER = { idle: 1.7, next: 3.2, after: 2.0, done: 0.12 };
const _l0 = new THREE.Vector3(), _l1 = new THREE.Vector3();

export class Gate {
  // def: { t: square|ring|flag|arch|hoop, p:[x,y,z], yaw(도), pitch(도), w, h, r }
  constructor(def, world, index) {
    this.def = def;
    this.index = index;
    this.type = def.t || "square";
    this.pos = new THREE.Vector3(...def.p);
    _e.set((def.pitch || 0) * DEG, (def.yaw || 0) * DEG, 0, "YXZ");
    this.q = new THREE.Quaternion().setFromEuler(_e);
    this.qi = this.q.clone().invert();
    this.fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.q);
    this.group = new THREE.Group();
    this.group.position.copy(this.pos);
    this.group.quaternion.copy(this.q);
    // 발광 막대(상태 색) + 어두운 틀 + 다음 게이트에만 켜지는 옅은 빛막
    this.mat = toonMat({ color: 0x111111, emissive: GATE_COLORS.idle, emissiveIntensity: GATE_POWER.idle });
    this.frameMat = toonMat({ color: 0x2a2f3c, spec: 0.5, shine: 50 });
    this.veilMat = new THREE.MeshBasicMaterial({ color: GATE_COLORS.next, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.veil = null;
    this.state = "idle";
    this.world = world;
    this._build(world);
    if (this.veil) { this.veil.visible = false; this.veil.renderOrder = 7; this.group.add(this.veil); }
    world.scene.add(this.group);
  }

  _bar(a, b, r, glow = true) {
    // 로컬 좌표의 두 점을 잇는 막대 + 월드 충돌 캡슐
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(cylG(1), glow ? this.mat : this.frameMat);
    m.scale.set(r, len, r);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(Y, d.normalize());
    m.castShadow = true;
    this.group.add(m);
    const wa = a.clone().applyQuaternion(this.q).add(this.pos), wb = b.clone().applyQuaternion(this.q).add(this.pos);
    this.world.col.addCapsule(wa, wb, r, "gate");
  }

  _build(world) {
    const d = this.def, V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const groundY = world.h(this.pos.x, this.pos.z);
    const legs = (hw, bottom) => {
      // 기울어지지 않은 게이트는 바닥까지 다리를 내린다
      if (d.pitch) return;
      const drop = this.pos.y + bottom - groundY;
      if (drop > 0.3 && drop < 30) { this._bar(V(-hw, bottom), V(-hw, bottom - drop), 0.07, false); this._bar(V(hw, bottom), V(hw, bottom - drop), 0.07, false); }
    };
    if (this.type === "square") {
      const hw = (this.w = d.w || 3.4) / 2, hh = (this.h = d.h || 3.0) / 2, r = 0.11;
      this._bar(V(-hw, -hh), V(hw, -hh), r); this._bar(V(-hw, hh), V(hw, hh), r);
      this._bar(V(-hw, -hh), V(-hw, hh), r); this._bar(V(hw, -hh), V(hw, hh), r);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) { // 모서리 블록
        const c = new THREE.Mesh(boxG(), this.frameMat); c.scale.setScalar(0.38); c.position.set(sx * hw, sy * hh, 0); this.group.add(c);
      }
      this.veil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hh * 2), this.veilMat);
      legs(hw, -hh);
    } else if (this.type === "ring" || this.type === "hoop") {
      const R = (this.r = d.r || (this.type === "hoop" ? 5 : 1.9));
      const hoop = this.type === "hoop";
      const tor = new THREE.Mesh(new THREE.TorusGeometry(R, hoop ? 0.16 : 0.12, 10, 56), this.mat);
      tor.castShadow = !hoop;
      this.group.add(tor);
      this.veil = new THREE.Mesh(new THREE.CircleGeometry(R, 40), this.veilMat);
      if (hoop) {
        const inner = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, 0.04, 6, 56), this.mat);
        this.group.add(inner);
      } else {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
          const wa = V(Math.cos(a0) * R, Math.sin(a0) * R).applyQuaternion(this.q).add(this.pos);
          const wb = V(Math.cos(a1) * R, Math.sin(a1) * R).applyQuaternion(this.q).add(this.pos);
          world.col.addCapsule(wa, wb, 0.12, "gate");
        }
        if (!d.pitch) {
          const drop = this.pos.y - R - groundY;
          if (drop > 0.3 && drop < 30) this._bar(V(0, -R), V(0, -R - drop), 0.08, false);
        }
      }
    } else if (this.type === "flag") {
      // 깃발 두 개 사이를 통과 (p 는 바닥 중앙)
      const hw = (this.w = d.w || 5) / 2; this.h = d.h || 6;
      this.mat.side = THREE.DoubleSide;
      for (const sx of [-1, 1]) {
        this._bar(V(sx * hw, 0), V(sx * hw, this.h), 0.06, false);
        const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, this.h * 0.7), this.mat);
        fl.position.set(sx * (hw + 0.5), this.h * 0.62, 0);
        this.group.add(fl);
      }
    } else if (this.type === "arch") {
      // 공기 아치: 반원 아래를 통과 (p 는 바닥 중앙)
      const R = (this.r = d.r || 3.2);
      const tor = new THREE.Mesh(new THREE.TorusGeometry(R, 0.32, 10, 32, Math.PI), this.mat);
      tor.castShadow = true;
      this.group.add(tor);
      this.veil = new THREE.Mesh(new THREE.CircleGeometry(R, 24, 0, Math.PI), this.veilMat);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI;
        const wa = V(Math.cos(a0) * R, Math.sin(a0) * R).applyQuaternion(this.q).add(this.pos);
        const wb = V(Math.cos(a1) * R, Math.sin(a1) * R).applyQuaternion(this.q).add(this.pos);
        world.col.addCapsule(wa, wb, 0.32, "gate");
      }
    }
    // 진행 방향 표시(쉐브론)
    if (this.type !== "hoop") {
      const ch = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), this.mat);
      ch.rotation.x = -Math.PI / 2;
      const top = this.type === "square" ? this.h / 2 + 0.4 : this.type === "ring" ? this.r + 0.35 : this.type === "arch" ? this.r + 0.6 : this.h + 0.3;
      ch.position.set(0, top, 0);
      this.group.add(ch);
    }
  }

  // 통과 지점의 중심(월드)
  center(out) {
    out.copy(this.pos);
    if (this.type === "flag") out.y += Math.min(this.h, 4) * 0.5;
    else if (this.type === "arch") out.y += this.r * 0.45;
    return out;
  }

  // p0→p1 이동이 게이트를 정방향으로 통과했는지
  crossed(p0, p1) {
    _l0.copy(p0).sub(this.pos).applyQuaternion(this.qi);
    _l1.copy(p1).sub(this.pos).applyQuaternion(this.qi);
    if (!(_l0.z > 0 && _l1.z <= 0)) return false;
    const t = _l0.z / (_l0.z - _l1.z);
    const x = _l0.x + (_l1.x - _l0.x) * t, y = _l0.y + (_l1.y - _l0.y) * t;
    switch (this.type) {
      case "square": return Math.abs(x) < this.w / 2 && Math.abs(y) < this.h / 2;
      case "ring": case "hoop": return x * x + y * y < this.r * this.r;
      case "flag": return Math.abs(x) < this.w / 2 && y > -0.5 && y < this.h + 4;
      case "arch": return y > -0.5 && x * x + y * y < this.r * this.r;
    }
    return false;
  }

  setState(s) {
    if (this.state === s) return;
    this.state = s;
    this.mat.emissive.setHex(GATE_COLORS[s]);
    this.mat.emissiveIntensity = this.power = GATE_POWER[s];
    // 지나간 게이트는 틀까지 어둡게, 다음 게이트는 빛막을 켠다
    this.mat.color.setHex(s === "done" ? 0x3a4050 : 0x111111);
    if (this.veil) this.veil.visible = s === "next";
  }
}

// 갭(양방향) 통과 판정
export function gapCrossed(g, p0, p1) {
  _l0.copy(p0).sub(g.pos).applyQuaternion(g.qi);
  _l1.copy(p1).sub(g.pos).applyQuaternion(g.qi);
  if (_l0.z * _l1.z > 0 || _l0.z === _l1.z) return false;
  const t = _l0.z / (_l0.z - _l1.z);
  const x = _l0.x + (_l1.x - _l0.x) * t, y = _l0.y + (_l1.y - _l0.y) * t;
  return Math.abs(x) < g.w / 2 && Math.abs(y) < g.h / 2;
}

// 게이트 목록에 진행 방향(yaw)을 자동 계산해 넣는다
export function orientGates(gates, loop = true) {
  const n = gates.length;
  gates.forEach((g, i) => {
    if (g.yaw !== undefined) return;
    const a = gates[loop ? (i - 1 + n) % n : Math.max(0, i - 1)].p;
    const b = gates[loop ? (i + 1) % n : Math.min(n - 1, i + 1)].p;
    g.yaw = Math.atan2(-(b[0] - a[0]), -(b[2] - a[2])) / DEG;
  });
  return gates;
}
