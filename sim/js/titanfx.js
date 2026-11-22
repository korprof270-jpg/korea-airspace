// 거대로봇 전용 연출·지형 파괴: 공격 예고(바닥 원·충격파 고리·레이저 조준선·광선), 발자국 균열 자국, 소품 짓밟기
// 모두 미리 만들어 돌려 쓰고(풀), 쓰지 않는 동안은 숨겨 그리기 호출을 쓰지 않는다
import * as THREE from "../vendor/three.module.min.js";

const V3 = THREE.Vector3;
const _a = new V3(), _b = new V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new V3();
const UP = new V3(0, 1, 0);
const NRING = 8, NBEAM = 3, NCRACK = 18;

// 균열 무늬 텍스처 (가운데서 갈라져 나가는 검은 금 + 그을림)
let _crackTex = null;
function crackTex() {
  if (_crackTex) return _crackTex;
  const N = 256, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(N / 2, N / 2, 4, N / 2, N / 2, N / 2);
  grd.addColorStop(0, "rgba(20,16,12,0.85)"); grd.addColorStop(0.35, "rgba(30,24,18,0.45)"); grd.addColorStop(1, "rgba(30,24,18,0)");
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
  let s = 11; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  g.strokeStyle = "rgba(8,6,4,0.95)"; g.lineCap = "round";
  for (let k = 0; k < 9; k++) {
    let x = N / 2, y = N / 2, a = (k / 9) * Math.PI * 2 + R() * 0.5, w = 5;
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 7; i++) { a += (R() - 0.5) * 0.9; const L = 10 + R() * 12; x += Math.cos(a) * L; y += Math.sin(a) * L; g.lineWidth = w; g.lineTo(x, y); w *= 0.8; }
    g.stroke();
  }
  _crackTex = new THREE.CanvasTexture(cv);
  _crackTex.colorSpace = THREE.SRGBColorSpace;
  return _crackTex;
}

export class TitanFX {
  constructor(c) {
    this.c = c; this.w = c.w; this.scene = c.w.scene;
    this.objs = [];
    // 바닥에 눕힌 고리·원판 (예고 범위·충격파)
    const ringGeo = new THREE.RingGeometry(0.955, 1, 96); ringGeo.rotateX(-Math.PI / 2);
    const discGeo = new THREE.CircleGeometry(1, 56); discGeo.rotateX(-Math.PI / 2);
    this.geos = [ringGeo, discGeo];
    this.rings = [];
    for (let i = 0; i < NRING; i++) {
      const disc = i % 2 === 1;
      const m = new THREE.Mesh(disc ? discGeo : ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.visible = false; m.frustumCulled = false; m.renderOrder = 22;
      this.add(m);
      this.rings.push({ m, disc, busy: false, t: 0, life: 0, r0: 0, r1: 0, a: 0, held: false });
    }
    // 광선 세트: 굵은 심 + 바깥 빛 + 조준선 둘 (시작·끝 방향)
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true); cylGeo.translate(0, 0.5, 0);
    this.geos.push(cylGeo);
    const mk = (col, op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.beams = [];
    for (let i = 0; i < NBEAM; i++) {
      const parts = [mk(0xffffff, 1), mk(0xff2a4a, 0.5), mk(0xff3a3a, 0.8), mk(0xff3a3a, 0.5)].map((mat) => { const me = new THREE.Mesh(cylGeo, mat); me.visible = false; me.frustumCulled = false; me.renderOrder = 22; this.add(me); return me; });
      this.beams.push({ core: parts[0], glow: parts[1], lineA: parts[2], lineB: parts[3], busy: false });
    }
    // 발자국·충격 균열 자국 (인스턴스 하나 = 그리기 호출 한 번)
    const dg = new THREE.PlaneGeometry(1, 1); dg.rotateX(-Math.PI / 2); this.geos.push(dg);
    this.crackMat = new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, color: 0xffffff });
    this.cracks = new THREE.InstancedMesh(dg, this.crackMat, NCRACK);
    this.cracks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cracks.frustumCulled = false; this.cracks.count = 0; this.cracks.visible = false; this.cracks.renderOrder = 3;
    this.cracks.userData.toonDone = true;
    this.add(this.cracks);
    this.crackL = []; this._ci = 0;
    for (let i = 0; i < NCRACK; i++) this.crackL.push({ on: false, p: new V3(), q: new THREE.Quaternion(), size: 1, life: 0, max: 1 });
    this.crushed = 0;
  }
  add(o) { o.userData.toonDone = true; this.scene.add(o); this.objs.push(o); }

  // ── 바닥 고리 ──
  // 퍼지는 고리 (충격파): r0 → r1, life 초
  wave(pos, r0, r1, life, color, opacity = 0.9) {
    const r = this._ring(false); if (!r) return null;
    Object.assign(r, { busy: true, held: false, t: 0, life, r0, r1, a: opacity });
    r.m.position.copy(pos); r.m.material.color.set(color); r.m.visible = true; r.m.scale.setScalar(Math.max(0.01, r0));
    return r;
  }
  // 붙잡아 두는 고리·원판 (예고 범위): 매 프레임 hold(h, pos, radius, opacity) 로 갱신, 끝나면 drop(h)
  hold(disc, color) {
    const r = this._ring(disc); if (!r) return null;
    r.busy = true; r.held = true; r.m.material.color.set(color); r.m.material.opacity = 0; r.m.visible = true;
    return r;
  }
  set(h, pos, radius, opacity, color) {
    if (!h) return;
    h.m.position.copy(pos); h.m.scale.setScalar(Math.max(0.01, radius)); h.m.material.opacity = opacity;
    if (color !== undefined) h.m.material.color.set(color);
  }
  drop(h) { if (h) { h.busy = false; h.held = false; h.m.visible = false; } return null; }
  _ring(disc) { for (const r of this.rings) if (!r.busy && r.disc === disc) return r; return null; }

  // ── 광선 ──
  beam() { for (const b of this.beams) if (!b.busy) { b.busy = true; return b; } return null; }
  freeBeam(b) { if (b) { b.busy = false; for (const k of ["core", "glow", "lineA", "lineB"]) b[k].visible = false; } return null; }
  // 메시 me 를 from 에서 dir 로 len 만큼, 굵기 w 로
  static stretch(me, from, dir, len, w) {
    me.position.copy(from); me.quaternion.setFromUnitVectors(UP, dir); me.scale.set(w, Math.max(0.01, len), w); me.visible = true;
  }

  // ── 균열 자국 ──
  crack(pos, size, life = 9) {
    const d = this.crackL[this._ci = (this._ci + 1) % NCRACK], w = this.w, e = 1.2;
    const nx = w.h(pos.x - e, pos.z) - w.h(pos.x + e, pos.z), nz = w.h(pos.x, pos.z - e) - w.h(pos.x, pos.z + e);
    _a.set(nx, 2 * e, nz).normalize();
    d.q.setFromUnitVectors(UP, _a).multiply(_q.setFromAxisAngle(UP, Math.random() * 6.28));
    d.p.set(pos.x, w.h(pos.x, pos.z) + 0.12, pos.z); d.size = size; d.life = d.max = life; d.on = true;
  }

  update(dt) {
    for (const r of this.rings) {
      if (!r.busy || r.held) continue;
      r.t += dt;
      const k = r.t / r.life;
      if (k >= 1) { r.busy = false; r.m.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k);
      r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * e);
      r.m.material.opacity = r.a * (1 - k * k);
    }
    let n = 0;
    for (const d of this.crackL) {
      if (!d.on) continue;
      d.life -= dt;
      if (d.life <= 0) { d.on = false; continue; }
      const k = Math.min(1, d.life / 1.5);   // 끝 1.5초 동안 줄어들며 사라진다
      _m.compose(d.p, d.q, _s.set(d.size * (0.6 + 0.4 * k), 1, d.size * (0.6 + 0.4 * k)));
      this.cracks.setMatrixAt(n++, _m);
    }
    this.cracks.count = n; this.cracks.visible = n > 0;
    if (n) this.cracks.instanceMatrix.needsUpdate = true;
  }

  // ── 소품 짓밟기 ──
  // 원기둥 영역(중심 p, 반경 R, 바닥에서 높이 H) 에 걸친 정적 충돌체를 끄고, 그 자리의 합쳐진 맵 메시 정점을 바닥으로 주저앉힌다
  // 너무 큰 것(가로 반경 maxR 초과)은 남기고 true 를 돌려준다 (막힘)
  crush(p, R, H, maxR = 26, onBreak = null) {
    const col = this.w.col, CELL = 12, gy = this.w.h(p.x, p.z);
    const x0 = Math.floor((p.x - R - maxR) / CELL), x1 = Math.floor((p.x + R + maxR) / CELL), z0 = Math.floor((p.z - R - maxR) / CELL), z1 = Math.floor((p.z + R + maxR) / CELL);
    let blocked = false;
    const seen = this._seen || (this._seen = new Set()); seen.clear();
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const cell = col.grid.get(ix * 8192 + iz);
      if (!cell) continue;
      for (const c of cell) {
        if (c.off || c.owner || c.dyn || seen.has(c) || SKIP.has(c.tag)) continue;
        seen.add(c);
        const bb = aabb(c, BB);
        if (bb.max.y < gy + 0.8 || bb.min.y > gy + H) continue;
        const cx = Math.max(bb.min.x, Math.min(p.x, bb.max.x)), cz = Math.max(bb.min.z, Math.min(p.z, bb.max.z));
        if ((cx - p.x) ** 2 + (cz - p.z) ** 2 > R * R) continue;
        const hr = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2;
        if (hr > maxR || bb.max.y - bb.min.y > H * 1.6) { blocked = true; continue; }
        c.off = true;
        this.crushed++;
        // 나무 잎 등 충돌체 밖으로 삐져나온 부분까지 (높이에 비례해 가로 여유)
        const pad = Math.min(4, 0.6 + (bb.max.y - bb.min.y) * 0.28);
        bb.min.x -= pad; bb.min.z -= pad; bb.max.x += pad; bb.max.z += pad; bb.max.y += 4.5;
        this._flatten(bb);
        _a.set((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2);
        if (onBreak) onBreak(_a, hr, bb.max.y - bb.min.y);
      }
    }
    return blocked;
  }

  // 정점 색인: 맵 메시(재질별로 합쳐진 덩어리)의 정점을 12m 칸으로 나눠 둔다 (처음 짓밟을 때 한 번)
  _index() {
    if (this.idx !== undefined) return this.idx;
    const L = [];
    let total = 0;
    for (const o of this.scene.children) {
      if (!o.isMesh || o.isInstancedMesh || o.userData.lod !== false || o === this.w.waterMesh || !o.geometry || !o.geometry.attributes.position) continue;
      const P = o.geometry.attributes.position;
      if (P.count < 8 || !P.array || P.isInterleavedBufferAttribute) continue;
      total += P.count;
      L.push(o);
    }
    if (total > 3e6) return (this.idx = null);   // 너무 큰 맵은 충돌만 끈다
    // 칸별 정점 번호 (두 번 훑어 형식 배열로: 휴대폰 메모리 절약)
    this.idx = L.map((o) => {
      const P = o.geometry.attributes.position, A = P.array, cnt = new Map();
      o.updateMatrixWorld();
      if (!o.matrixWorld.equals(IDENT)) return null;
      const key = new Int32Array(P.count);
      for (let i = 0; i < P.count; i++) { key[i] = Math.floor(A[i * 3] / 12) * 8192 + Math.floor(A[i * 3 + 2] / 12); const k = key[i]; cnt.set(k, (cnt.get(k) || 0) + 1); }   // NaN 정점도 형식 배열 값(0)으로 맞춘다
      const cells = new Map();
      for (const [k, n] of cnt) cells.set(k, { a: new Int32Array(n), n: 0 });
      for (let i = 0; i < P.count; i++) { const e = cells.get(key[i]); e.a[e.n++] = i; }
      for (const [k, e] of cells) cells.set(k, e.a);
      return { o, P, cells };
    }).filter(Boolean);
    return this.idx;
  }
  _flatten(bb) {
    const idx = this._index();
    if (!idx) return;
    const w = this.w, x0 = Math.floor(bb.min.x / 12), x1 = Math.floor(bb.max.x / 12), z0 = Math.floor(bb.min.z / 12), z1 = Math.floor(bb.max.z / 12);
    for (const e of idx) {
      const A = e.P.array;
      let lo = Infinity, hi = -1;
      for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
        const L = e.cells.get(ix * 8192 + iz);
        if (!L) continue;
        for (const i of L) {
          const x = A[i * 3], y = A[i * 3 + 1], z = A[i * 3 + 2];
          if (x < bb.min.x || x > bb.max.x || z < bb.min.z || z > bb.max.z || y > bb.max.y || y < bb.min.y - 0.5) continue;
          const g = w.h(x, z);
          if (y < g + 0.45) continue;
          // 잔해 더미: 바닥 가까이 낮게 깔리고, 원래 높을수록 조금 더 쌓인다
          A[i * 3 + 1] = g + 0.2 + Math.min(1.6, (y - g) * 0.06) * (0.5 + ((i * 2654435761) >>> 0) / 4294967296);
          if (i < lo) lo = i; if (i > hi) hi = i;
        }
      }
      if (hi >= 0) {
        if (e.P.addUpdateRange) e.P.addUpdateRange(lo * 3, (hi - lo + 1) * 3);
        e.P.needsUpdate = true;
      }
    }
  }

  dispose() {
    for (const o of this.objs) { this.scene.remove(o); if (o.material) o.material.dispose(); }
    for (const g of this.geos) g.dispose();
  }
}
const IDENT = new THREE.Matrix4();
// 짓밟지 않는 충돌체: 다른 유닛·포탑·코어·관문 등 (주인이 있는 것은 위에서 이미 뺀다)
const SKIP = new Set(["enemy", "mover", "core", "turret", "gate", "truck", "pad", "spawn"]);
const BB = new THREE.Box3();
// 충돌체의 축 정렬 상자
function aabb(c, out) {
  if (c.type === 1) { out.min.set(c.c.x - c.r, c.c.y - c.r, c.c.z - c.r); out.max.set(c.c.x + c.r, c.c.y + c.r, c.c.z + c.r); return out; }
  if (c.type === 2) {
    const ax = c.a.x, ay = c.a.y, az = c.a.z, bx = ax + c.ab.x, by = ay + c.ab.y, bz = az + c.ab.z, r = c.r;
    out.min.set(Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.min(az, bz) - r); out.max.set(Math.max(ax, bx) + r, Math.max(ay, by) + r, Math.max(az, bz) + r); return out;
  }
  // 회전 상자: 각 축 반경 = |R| · h
  _m.makeRotationFromQuaternion(c.q); const e = _m.elements, h = c.h;
  const ex = Math.abs(e[0]) * h.x + Math.abs(e[4]) * h.y + Math.abs(e[8]) * h.z;
  const ey = Math.abs(e[1]) * h.x + Math.abs(e[5]) * h.y + Math.abs(e[9]) * h.z;
  const ez = Math.abs(e[2]) * h.x + Math.abs(e[6]) * h.y + Math.abs(e[10]) * h.z;
  out.min.set(c.c.x - ex, c.c.y - ey, c.c.z - ez); out.max.set(c.c.x + ex, c.c.y + ey, c.c.z + ez);
  return out;
}
