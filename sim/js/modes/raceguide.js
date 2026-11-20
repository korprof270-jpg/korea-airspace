// 레이싱 안내(월드): 다음 게이트까지 레이싱 라인을 따라 흐르는 화살표 + 다음 게이트 표지(빛기둥·화살·파동 고리)
// 설정 hud.guideLine 으로 켜고 끈다. 만든 것은 dispose() 에서 모두 치운다
import * as THREE from "../../vendor/three.module.min.js";
import { settings, clamp } from "../config.js";

const MAXN = 26;          // 화살표 최대 개수
const SPACING = 3.4;      // 화살표 간격(m)
const FLOW = 9;           // 흐르는 속도(m/s)
const DROP = 0.9;         // 레이싱 라인보다 낮춰 위에서 내려다보이게 한다
const MAXS = 180;         // 구간 표본 최대 개수
const COLOR = 0x25ff6a;   // '다음 게이트' 색과 같게

const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _c = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

// 갈매기(＞) 모양 판. -Z 가 진행 방향, +Y 가 면. grow 만큼 부풀리면 외곽선용 껍질
function chevronGeo(grow = 0) {
  const g = grow, sh = new THREE.Shape();
  sh.moveTo(0, 0.55 + g * 1.5);
  sh.lineTo(0.85 + g, -0.15 + g * 0.4);
  sh.lineTo(0.85 + g, -0.6 - g);
  sh.lineTo(0, 0.1 - g * 1.2);
  sh.lineTo(-0.85 - g, -0.6 - g);
  sh.lineTo(-0.85 - g, -0.15 + g * 0.4);
  sh.closePath();
  const depth = 0.14 + g * 2;
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);          // 모양의 +y → -z(앞), 두께 → +y
  geo.translate(0, -depth / 2, 0);
  return geo;
}

export class RaceGuide {
  constructor(mode) {
    this.mode = mode;
    this.world = mode.s.world;
    const scene = this.world.scene, night = !!this.world.night;
    const col = new THREE.Color(COLOR);
    this.gate = null;
    this.P = new Float32Array((MAXS + 1) * 3);
    this.T = new Float32Array((MAXS + 1) * 3);
    this.M = 0; this.len = 1;

    // 흐르는 화살표: 채움 + 먹선(뒤집은 껍질)
    this.geo = chevronGeo(0); this.hullGeo = chevronGeo(0.09);
    this.mat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(night ? 1.25 : 1.05), fog: false });
    this.hullMat = new THREE.MeshBasicMaterial({ color: 0x04120a, side: THREE.BackSide, fog: false });
    this.inst = new THREE.InstancedMesh(this.geo, this.mat, MAXN);
    this.hull = new THREE.InstancedMesh(this.hullGeo, this.hullMat, MAXN);
    for (const m of [this.inst, this.hull]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.visible = false; }
    scene.add(this.inst, this.hull);

    // 다음 게이트 표지
    const b = (this.beacon = new THREE.Group());
    this.pillarGeo = new THREE.CylinderGeometry(0.45, 0.45, 1, 10, 1, true);
    this.pillarGeo.translate(0, 0.5, 0);
    this.pillarMat = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: night ? 0.22 : 0.36, depthWrite: false, side: THREE.DoubleSide, fog: false,
      blending: night ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.pillar = new THREE.Mesh(this.pillarGeo, this.pillarMat);
    this.arrowGeo = new THREE.ConeGeometry(0.75, 1.5, 4);
    this.arrowGeo.rotateX(Math.PI);     // 아래를 가리킴
    this.arrow = new THREE.Mesh(this.arrowGeo, this.mat);
    const hull = new THREE.Mesh(this.arrowGeo, this.hullMat);
    hull.scale.setScalar(1.24);
    this.arrow.add(hull);
    this.ringGeo = new THREE.RingGeometry(0.9, 1, 48);
    this.rings = [0, 1].map(() => new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({
      color: col.clone().multiplyScalar(night ? 1.4 : 1), transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false,
    })));
    b.add(this.pillar, this.arrow, ...this.rings);
    b.visible = false;
    scene.add(b);
    this.top = 2; this.rad = 2;
  }

  // 다음 게이트와 레이싱 라인 구간[sA, sB]을 정한다 (gate=null 이면 숨김)
  setTarget(gate, sA = 0, sB = 1) {
    this.gate = gate || null;
    if (!gate) { this.inst.visible = this.hull.visible = this.beacon.visible = false; return; }
    const m = this.mode, w = this.world, len = (this.len = Math.max(1, sB - sA));
    const M = (this.M = clamp(Math.ceil(len / 1.2), 4, MAXS));
    for (let i = 0; i <= M; i++) {
      const u = m._u(sA + (len * i) / M);
      m.curve.getPointAt(u, _p); m.curve.getTangentAt(u, _t);
      _p.y = Math.max(_p.y - DROP, w.h(_p.x, _p.z) + 0.35);
      _p.toArray(this.P, i * 3); _t.toArray(this.T, i * 3);
    }
    // 표지 배치
    const g = gate, t = g.type;
    this.top = t === "square" ? g.h / 2 : t === "flag" ? g.h - Math.min(g.h, 4) * 0.5 : t === "arch" ? g.r * 0.55 : g.r;
    this.rad = t === "square" ? Math.max(g.w, g.h) * 0.56 : t === "flag" ? g.w / 2 : g.r;
    g.center(this.beacon.position);
    this.pillar.position.y = this.top + 3.2;
    this.pillar.scale.set(1, 70, 1);
    for (const r of this.rings) r.quaternion.copy(g.q);
  }

  update(dt, time, pos, cam) {
    const g = this.gate;
    const on = !!g && settings.hud.guideLine !== false && this.mode.state !== "done";
    this.inst.visible = this.hull.visible = this.beacon.visible = on;
    if (!on) return;

    // 표지 애니메이션
    this.arrow.position.y = this.top + 1.9 + Math.sin(time * 4.2) * 0.32;
    this.arrow.rotation.y = time * 2.2;
    this.pillarMat.opacity = (this.world.night ? 0.2 : 0.32) * (0.8 + 0.2 * Math.sin(time * 6));
    for (let i = 0; i < 2; i++) {
      const k = (time * 0.9 + i * 0.5) % 1, r = this.rings[i];
      r.scale.setScalar(this.rad * (1 + k * 0.85));
      r.material.opacity = (1 - k) * 0.7;
    }

    // 플레이어의 진행 위치(가장 가까운 표본)
    const P = this.P, T = this.T, M = this.M, len = this.len, ds = len / M;
    let bi = 0, bd = 1e12;
    for (let i = 0; i <= M; i++) {
      const dx = P[i * 3] - pos.x, dy = P[i * 3 + 1] - pos.y, dz = P[i * 3 + 2] - pos.z, d = dx * dx + dy * dy + dz * dz;
      if (d < bd) { bd = d; bi = i; }
    }
    // 게이트를 지나쳤거나 라인에서 멀면: 게이트 앞 진입 구간만 보여 준다
    g.center(_c);
    const past = (pos.x - _c.x) * g.fwd.x + (pos.y - _c.y) * g.fwd.y + (pos.z - _c.z) * g.fwd.z > 0.4;
    const s0 = past || bd > 196 ? Math.max(0, len - 44) : bi * ds + 3;
    const f = (time * FLOW) % SPACING;
    let n = 0;
    for (let s = f + Math.ceil((s0 - f) / SPACING) * SPACING; s < len - 1.4 && n < MAXN; s += SPACING) {
      const fi = s / ds, i0 = Math.min(M - 1, Math.max(0, fi | 0)), k = fi - i0, a = i0 * 3, b = a + 3;
      _p.set(P[a] + (P[b] - P[a]) * k, P[a + 1] + (P[b + 1] - P[a + 1]) * k, P[a + 2] + (P[b + 2] - P[a + 2]) * k);
      _t.set(T[a] + (T[b] - T[a]) * k, T[a + 1] + (T[b + 1] - T[a + 1]) * k, T[a + 2] + (T[b + 2] - T[a + 2]) * k).normalize();
      // 크기: 시작·끝에서 줄고, 카메라 코앞에서는 사라지며, 멀수록 조금 키운다
      const dc = _p.distanceTo(cam.position);
      let sc = clamp((s - s0) / 4 + 0.3, 0, 1) * clamp((len - s) / 3, 0.35, 1) * clamp(0.9 + dc / 55, 0.9, 2);
      if (dc < 2.4) sc *= clamp((dc - 0.9) / 1.5, 0, 1);
      if (sc <= 0.01) continue;
      // 진행 방향을 축으로, 면이 카메라를 향하게
      _z.copy(_t).negate();
      _y.copy(cam.position).sub(_p); _y.addScaledVector(_t, -_y.dot(_t));
      if (_y.lengthSq() < 0.01) { _y.set(0, 1, 0).addScaledVector(_t, -_t.y); if (_y.lengthSq() < 0.01) _y.set(1, 0, 0); }
      _y.normalize();
      _x.crossVectors(_y, _z);
      _m.makeBasis(_x, _y, _z).scale(_s.setScalar(sc)).setPosition(_p);
      this.inst.setMatrixAt(n, _m); this.hull.setMatrixAt(n, _m);
      n++;
    }
    this.inst.count = this.hull.count = n;
    this.inst.instanceMatrix.needsUpdate = this.hull.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    const scene = this.world.scene;
    scene.remove(this.inst, this.hull, this.beacon);
    this.inst.dispose(); this.hull.dispose();
    for (const o of [this.geo, this.hullGeo, this.mat, this.hullMat, this.pillarGeo, this.pillarMat, this.arrowGeo, this.ringGeo]) o.dispose();
    for (const r of this.rings) r.material.dispose();
  }
}
