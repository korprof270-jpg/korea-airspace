// 시각 효과: 파티클(폭발·스파크·총구 섬광·연기), 섬광 구, 충격파 고리, 레이저 볼트 인스턴스 — 모두 풀링
import * as THREE from "../vendor/three.module.min.js";

const MAXP = 2400;   // 빛나는(가산 혼합) 파티클
const MAXS = 420;    // 연기(일반 혼합) 파티클
const MAXB = 640;
const WHITE = new THREE.Color(0xffffff);
const NFLASH = 14;
const MAXD = 120;    // 격파 잔해 조각 (인스턴스 상자)
const NRING = 10;
const MAXW = 48;     // 격추 잔해 덩어리 (땅에 떨어져 튀고 연기 내며 남는 큰 조각, 인스턴스 하나)
const MAXH = 10;     // 격추된 기체 몸통 (연기 뿜으며 회전해 떨어지는 그을린 동체, 인스턴스 하나)
const _hitW = { depth: 0, normal: new THREE.Vector3(), collider: null };

// 여러 지오메트리를 하나로 (위치·법선만, 인덱스 없이) — 몸통 잔해 모양을 한 번의 드로우 콜로
function mergeGeos(list) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of parts) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o); nor.set(g.attributes.normal.array, o); o += g.attributes.position.count * 3; g.dispose(); }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}
// 부서진 드론 몸통: 납작한 동체 + 한쪽이 꺾인 X 자 팔 + 모터 셋 (지름 약 2, 크기는 인스턴스에서)
function hullGeo() {
  const L = [], add = (g, x, y, z, ry = 0, rz = 0) => { g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); L.push(g); };
  add(new THREE.BoxGeometry(0.75, 0.28, 1.05), 0, 0, 0);
  add(new THREE.BoxGeometry(0.5, 0.18, 0.5), 0, 0.2, -0.1);
  add(new THREE.BoxGeometry(2.0, 0.1, 0.14), 0, 0, 0, Math.PI / 4);
  add(new THREE.BoxGeometry(1.0, 0.1, 0.14), -0.36, -0.08, -0.36, -Math.PI / 4, 0.35);   // 꺾여 늘어진 팔
  add(new THREE.BoxGeometry(0.5, 0.1, 0.14), 0.18, 0, 0.18, -Math.PI / 4);              // 부러진 팔 토막
  for (const [x, z] of [[0.7, 0.7], [-0.7, -0.7], [-0.62, 0.66]]) add(new THREE.CylinderGeometry(0.17, 0.2, 0.22, 7), x, x < 0 && z > 0 ? -0.22 : 0.06, z);
  return mergeGeos(L);
}
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _u = new THREE.Vector3(), _w = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);

// 고정 크기 파티클 풀 (Points 한 개 = 드로우 콜 한 번)
class Particles {
  constructor(scene, max, additive, order) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.cursor = 0;
    this.live = 0;
    const g = (this.geo = new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("pcolor", new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("psize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float scale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = psize * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: additive
        ? `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC.rgb * a * vC.a * 1.7, a * vC.a); }`
        : `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.22, d) * vC.a * 0.6; gl_FragColor = vec4(vC.rgb, a); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = order;
    scene.add(this.points);
  }

  spawn(x, y, z, vx, vy, vz, r, g, b, life, size, grav = 0, grow = 0) {
    const i = this.cursor;
    this.cursor = (i + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.base[i * 3] = r; this.base[i * 3 + 1] = g; this.base[i * 3 + 2] = b;
    this.life[i] = this.maxLife[i] = life;
    this.size0[i] = size; this.grav[i] = grav; this.grow[i] = grow;
    this.live++;
  }

  update(dt, scale) {
    this.mat.uniforms.scale.value = scale;
    if (this.live <= 0) return;                 // 살아 있는 파티클이 없으면 버퍼 갱신도 생략
    const P = this.pos, C = this.col, S = this.size, V = this.vel, L = this.life;
    const drag = 1 - 1.8 * dt;
    let alive = 0;
    for (let i = 0, n = this.max; i < n; i++) {
      if (L[i] <= 0) { S[i] = 0; continue; }
      L[i] -= dt;
      const k = L[i] > 0 ? L[i] / this.maxLife[i] : 0, j = i * 3;
      V[j + 1] -= this.grav[i] * dt;
      V[j] *= drag; V[j + 1] *= drag; V[j + 2] *= drag;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      C[i * 4] = this.base[j]; C[i * 4 + 1] = this.base[j + 1]; C[i * 4 + 2] = this.base[j + 2]; C[i * 4 + 3] = k;
      S[i] = this.size0[i] * (1 + this.grow[i] * (1 - k));
      alive++;
    }
    this.live = alive;
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.pcolor.needsUpdate = true; a.psize.needsUpdate = true;
  }

  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.smokeP = new Particles(scene, MAXS, false, 19);
    this.glow = new Particles(scene, MAXP, true, 20);
    this.points = this.glow.points;   // 이전 이름 호환
    this.pmat = this.glow.mat;

    // 레이저 볼트 (인스턴스)
    this.boltGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1); this.boltGeo.rotateX(Math.PI / 2);   // 지름 1 · 길이 1 → 인스턴스에서 늘린다
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.9, 1.9), fog: false });   // 불투명: 밝은 하늘 앞에서도 색이 묻히지 않는다
    this.bolts = new THREE.InstancedMesh(this.boltGeo, this.boltMat, MAXB);
    this.bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bolts.frustumCulled = false;
    this.bolts.count = 0;
    this.bolts.setColorAt(0, _c.set(0xffffff));
    scene.add(this.bolts);

    // 섬광 구·충격파 고리: 미리 만들어 두고 돌려 쓴다
    this.flashGeo = new THREE.SphereGeometry(1, 12, 8);
    this.ringGeo = new THREE.RingGeometry(0.86, 1, 44);
    this.flashes = []; this.rings = [];
    const mk = (geo, list, n, side) => {
      for (let i = 0; i < n; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side });
        const m = new THREE.Mesh(geo, mat);
        m.visible = false; m.frustumCulled = false; m.renderOrder = 21;
        scene.add(m);
        list.push({ m, t: 0, life: 0, radius: 1, on: false });
      }
    };
    mk(this.flashGeo, this.flashes, NFLASH, THREE.FrontSide);
    mk(this.ringGeo, this.rings, NRING, THREE.DoubleSide);

    // 격파 잔해: 회전하며 떨어지는 작은 조각 (인스턴스 하나 = 드로우 콜 한 번)
    this.debGeo = new THREE.BoxGeometry(1, 0.45, 0.8);
    this.debMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.deb = new THREE.InstancedMesh(this.debGeo, this.debMat, MAXD);
    this.deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.deb.frustumCulled = false;
    this.deb.count = 0;
    this.deb.setColorAt(0, _c.set(0x222222));
    scene.add(this.deb);
    this.debris = [];
    for (let i = 0; i < MAXD; i++) this.debris.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0), spin: 0, life: 0, max: 1, size: 0.3, hot: false, col: new THREE.Color() });
    this._dc = 0;
    // 격추 잔해 덩어리: 음영 있는 찌그러진 조각. 중력으로 떨어져 지형·건물에 튀고, 멈추면 연기를 내다 가라앉는다 (인스턴스 하나 = 드로우 콜 한 번, 없으면 그리지 않음)
    this.wGeo = new THREE.IcosahedronGeometry(0.5, 0);
    this.wMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.wchunk = new THREE.InstancedMesh(this.wGeo, this.wMat, MAXW);
    this.wchunk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wchunk.frustumCulled = false; this.wchunk.count = 0; this.wchunk.visible = false;
    this.wchunk.setColorAt(0, _c.set(0x222222));
    scene.add(this.wchunk);
    this.wrecks = [];
    for (let i = 0; i < MAXW; i++) this.wrecks.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0), sc: new THREE.Vector3(1, 1, 1), spin: 0, life: 0, max: 1, size: 0.5, rest: false, bounce: 0, smokeT: 0, hot: 0, col: new THREE.Color() });
    this._wc = 0;
    // 격추된 몸통: 자기 속도를 이어받아 회전하며 떨어지고, 땅에 처박히며 2차 폭발, 멈춘 뒤 연기 기둥, 끝에 가라앉는다
    this.hGeo = hullGeo();
    this.hull = new THREE.InstancedMesh(this.hGeo, this.wMat, MAXH);
    this.hull.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hull.frustumCulled = false; this.hull.count = 0; this.hull.visible = false;
    this.hull.setColorAt(0, _c.set(0x222222));
    scene.add(this.hull);
    this.hulls = [];
    for (let i = 0; i < MAXH; i++) this.hulls.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), ax: new THREE.Vector3(1, 0, 0), spin: 0, t: 0, life: 1, size: 1, rest: false, hits: 0, smokeT: 0, col: new THREE.Color() });
    this._hc = 0;
    this.onWreckHit = null;   // 몸통이 처음 땅에 부딪힐 때 (pos, size) — combat.js 가 폭발음을 낸다
    this.col = null;    // 충돌 월드 (combat.js 가 넣어 준다): 잔해가 지형·건물에 부딪힌다. 없으면 y=0 바닥
    this.density = 1;   // 파티클 개수 배율 (그래픽 품질·자동 조절이 정한다)
  }

  // 잔해 조각: color = 기체 색(0xRRGGBB), n 조각, speed m/s, size m
  debrisBurst(pos, color, n = 10, speed = 12, size = 0.35) {
    n = Math.max(2, Math.round(n * this.density));
    for (let i = 0; i < n; i++) {
      const d = this.debris[this._dc]; this._dc = (this._dc + 1) % MAXD;
      const a = Math.random() * Math.PI * 2, u = Math.random() * 1.6 - 0.6, sv = speed * (0.4 + Math.random() * 0.8);
      d.on = true; d.p.copy(pos);
      d.v.set(Math.cos(a) * Math.sqrt(1 - Math.min(1, u * u)) * sv, u * sv + speed * 0.35, Math.sin(a) * Math.sqrt(1 - Math.min(1, u * u)) * sv);
      d.q.random(); d.ax.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      d.spin = 6 + Math.random() * 14; d.life = d.max = 1.1 + Math.random() * 0.9; d.size = size * (0.5 + Math.random());
      d.hot = Math.random() < 0.35;
      d.col.set(d.hot ? 0xffa040 : color).multiplyScalar(d.hot ? 1.6 : 0.55 + Math.random() * 0.3);
    }
  }

  // 격추 잔해 덩어리: n 개가 사방으로 튀어 떨어진다. color = 기체 색, size = 조각 크기(m), vel = 기체 속도(이어받음)
  wreckBurst(pos, color, n = 4, speed = 10, size = 0.6, vel = null) {
    n = Math.max(1, Math.round(n * Math.max(0.5, this.density)));
    for (let i = 0; i < n; i++) {
      const d = this.wrecks[this._wc]; this._wc = (this._wc + 1) % MAXW;
      const a = Math.random() * Math.PI * 2, sv = speed * (0.45 + Math.random() * 0.7);
      d.on = true; d.rest = false; d.bounce = 0; d.p.copy(pos);
      d.v.set(Math.cos(a) * sv, speed * (0.3 + Math.random() * 0.6), Math.sin(a) * sv);
      if (vel) d.v.addScaledVector(vel, 0.5);
      d.q.random(); d.ax.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      d.spin = 3 + Math.random() * 9; d.life = d.max = 4.5 + Math.random() * 2.5;
      d.size = size * (0.6 + Math.random() * 0.8);
      d.sc.set(1 + Math.random() * 0.8, 0.35 + Math.random() * 0.5, 0.7 + Math.random() * 0.6);   // 납작하고 길쭉한 판·덩어리
      d.hot = Math.random() < 0.6 ? 1 : 0; d.smokeT = Math.random() * 0.2;
      d.col.set(Math.random() < 0.35 ? color : 0x3a3d44).multiplyScalar(0.35 + Math.random() * 0.35);
    }
  }

  // 격추된 몸통 하나: pos 에서 vel 을 이어받아 떨어진다. size = 기체 반경(m), quat = 처음 자세, color = 기체 색
  wreckHull(pos, vel, size = 1, quat = null, color = 0x8a93a6) {
    let d = this.hulls.find((h) => !h.on);
    if (!d) { d = this.hulls[this._hc]; this._hc = (this._hc + 1) % MAXH; }
    d.on = true; d.rest = false; d.hits = 0; d.t = 0; d.life = 3.6 + Math.random() * 1.2; d.smokeT = 0;
    d.p.copy(pos); d.v.copy(vel || _u.set(0, 0, 0)).multiplyScalar(0.75); d.v.y += 3 + Math.random() * 4;
    if (quat) d.q.copy(quat); else d.q.identity();
    d.ax.set(Math.random() - 0.5, (Math.random() - 0.5) * 0.5, Math.random() - 0.5).normalize();
    d.spin = 3 + Math.random() * 4; d.size = size;
    d.col.set(color).lerp(_c.set(0x3a3d44), 0.65);   // 그을린 기체 색 (원래 색이 조금 남는다)
  }

  // 사방으로 퍼지는 파티클
  burst(pos, color, count = 20, speed = 8, life = 0.6, size = 0.3, grav = 6) {
    _c.set(color);
    if (this.density < 1) count = Math.max(1, Math.round(count * this.density));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = speed * (0.3 + Math.random() * 0.7);
      this.glow.spawn(pos.x, pos.y, pos.z, Math.cos(a) * s * v, u * v, Math.sin(a) * s * v, _c.r, _c.g, _c.b,
        life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), grav);
    }
  }

  // dir 방향 원뿔로 튀는 파티클 (명중 불꽃·총구 화염)
  cone(pos, dir, color, count, speed, spread, life, size, grav = 0) {
    _c.set(color);
    if (this.density < 1 && count > 2) count = Math.max(2, Math.round(count * this.density));
    // dir 에 수직인 두 축
    _u.set(dir.y, dir.z, dir.x).cross(dir).normalize();
    _w.crossVectors(dir, _u);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread, v = speed * (0.35 + Math.random() * 0.65);
      const cx = Math.cos(a) * r, cy = Math.sin(a) * r;
      this.glow.spawn(pos.x, pos.y, pos.z,
        (dir.x + _u.x * cx + _w.x * cy) * v, (dir.y + _u.y * cx + _w.y * cy) * v, (dir.z + _u.z * cx + _w.z * cy) * v,
        _c.r, _c.g, _c.b, life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), grav);
    }
  }

  // 한 점에서 천천히 퍼지는 꼬리(연기 꼬리·미사일)
  puff(pos, color, size = 0.25, life = 0.7, jitter = 0.4) {
    _c.set(color);
    this.glow.spawn(pos.x, pos.y, pos.z, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter + 0.2, (Math.random() - 0.5) * jitter,
      _c.r, _c.g, _c.b, life, size, -0.3, 1.2);
  }

  // 어두운 연기 한 덩이 (손상된 기체·폭발 잔해). tone: 밝기 0..1
  smoke(pos, size = 0.6, life = 1.3, tone = 0.12, spread = 0.6) {
    const t = tone * (0.75 + Math.random() * 0.5);
    this.smokeP.spawn(pos.x + (Math.random() - 0.5) * spread * 0.5, pos.y + (Math.random() - 0.5) * spread * 0.5, pos.z + (Math.random() - 0.5) * spread * 0.5,
      (Math.random() - 0.5) * spread, 0.5 + Math.random() * 0.9, (Math.random() - 0.5) * spread,
      t, t, t * 1.08, life * (0.7 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6), -0.7, 1.9);
  }

  explosion(pos, scale = 1) {
    this.burst(pos, 0xffb040, Math.round(46 * scale), 14 * scale, 0.7, 0.9 * scale, 4);
    this.burst(pos, 0xff4a1a, Math.round(30 * scale), 7 * scale, 1.0, 1.3 * scale, 1);
    this.burst(pos, 0xffffff, Math.round(14 * scale), 22 * scale, 0.35, 0.35 * scale, 9);
    this.burst(pos, 0xff9a3a, Math.round(10 * scale), 11 * scale, 1.5, 0.22 * scale, 13);   // 떨어지는 불씨
    this.flash(pos, 0xffd9a0, 3.2 * scale, 0.28);
    this.ring(pos, 0xffc98a, 6.5 * scale, 0.5);
    const n = Math.round(Math.min(14, 5 + 3 * scale) * Math.max(0.4, this.density));
    for (let i = 0; i < n; i++) this.smoke(pos, 1.5 * scale, 1.7, 0.1, 2.4 * scale);
  }

  // 격파 폭발: 여러 겹으로 터진다 — 흰 섬광 → 불덩이 → 2차 폭발 연쇄 → 이중 충격파 → 오래 남는 검은 연기 기둥과 불씨
  // 멀리서도 보이도록 섬광·충격파를 크게, 길게. lastBlast 는 조종석 효과(열기·흔들림)가 읽는다
  destroy(pos, scale = 1) {
    const k = Math.max(0.6, scale), q = Math.max(0.4, this.density);
    this.explosion(pos, k * 1.25);
    this.flash(pos, 0xffffff, 10 * k, 0.2);                                   // 눈부신 첫 섬광
    this.flash(pos, 0xff9a40, 13 * k, 1.1);                                   // 남는 불빛
    this.ring(pos, 0xffffff, 11 * k, 0.4);
    this.burst(pos, 0xffe9b0, Math.round(26 * k * q), 30 * k, 0.55, 0.3 * k, 6);       // 멀리 튀는 불티
    this.burst(pos, 0xff7a2a, Math.round(30 * k * q), 6 * k, 1.8, 3.4 * k, -1.5);
    this.burst(pos, 0xffd070, Math.round(16 * k * q), 3 * k, 1.1, 4.2 * k, -0.5);     // 밝은 중심     // 피어오르는 불덩이
    this.debrisBurst(pos, 0x3a3f4a, Math.round((5 + 3 * k) * q), 10 + 3 * k, 0.2 + 0.1 * k);
    const L = this.later || (this.later = []), at = pos.clone();
    const n2 = Math.min(5, 1 + Math.round(k * 1.2));
    for (let i = 0; i < n2; i++) L.push({ t: 0.1 + i * 0.13 + Math.random() * 0.08, f: () => {    // 2차 폭발 연쇄
      _s.set((Math.random() - 0.5) * 3.2 * k, (Math.random() - 0.2) * 2.4 * k, (Math.random() - 0.5) * 3.2 * k).add(at);
      this.burst(_s, 0xffc060, Math.round(20 * q), 9 * k, 0.7, 2.2 * k, 2); this.flash(_s, 0xffd9a0, 6 * k, 0.3);
    } });
    L.push({ t: 0.18, f: () => this.ring(at, 0xffc98a, 17 * k, 0.75) });                // 늦게 퍼지는 둘째 충격파
    for (let i = 0; i < 7; i++) L.push({ t: 0.3 + i * 0.28, f: () => {                  // 2초쯤 이어지는 연기 기둥
      _s.set(at.x, at.y + i * 0.9 * k, at.z);
      for (let j = 0; j < Math.max(1, Math.round(3 * q)); j++) this.smoke(_s, (1.8 + i * 0.25) * k, 2.4, 0.06, 1.6 * k);
      if (i < 4) this.burst(_s, 0xff8a3a, Math.round(5 * q), 3 * k, 0.9, 0.5 * k, -2);
    } });
    this.lastBlast = { pos: at, scale: k, t: 0 };
  }

  spark(pos, color = 0xffd27a, n = 8) { this.burst(pos, color, n, 6, 0.3, 0.16, 12); }

  // 명중 불꽃: 탄이 날아온 반대쪽으로 튄다 (dir = 탄 진행 방향)
  hitSpark(pos, dir, color = 0xffd27a, n = 7, big = false, flash = true) {
    _s.copy(dir).multiplyScalar(-1);
    this.cone(pos, _s, color, n, big ? 12 : 9, 0.9, 0.28, big ? 0.24 : 0.17, 9);
    if (!flash) return;
    this.cone(pos, _s, 0xffffff, big ? 4 : 2, 5, 0.6, 0.16, 0.2, 0);
    this.flash(pos, color, big ? 1.5 : 0.9, 0.09);
  }

  // 총구 섬광 (dir = 발사 방향). scale 로 기체 크기에 맞춘다
  muzzle(pos, dir, color, scale = 1) {
    this.cone(pos, dir, color, 3, 9 * scale, 0.25, 0.07, 0.16 * scale, 0);
    this.cone(pos, dir, 0xffffff, 1, 3 * scale, 0.1, 0.05, 0.26 * scale, 0);
  }

  _slot(list) {
    let best = list[0];
    for (const f of list) { if (!f.on) return f; if (f.t / f.life > best.t / best.life) best = f; }
    return best;   // 빈 자리가 없으면 가장 오래된 것을 재사용
  }

  flash(pos, color, radius, life) {
    const f = this._slot(this.flashes);
    f.on = true; f.t = 0; f.life = life; f.radius = radius;
    f.m.position.copy(pos); f.m.material.color.set(color); f.m.material.opacity = 0.85;
    f.m.scale.setScalar(radius * 0.3); f.m.visible = true;
  }

  // 카메라를 향해 퍼지는 충격파 고리
  ring(pos, color, radius, life = 0.45) {
    const f = this._slot(this.rings);
    f.on = true; f.t = 0; f.life = life; f.radius = radius;
    f.m.position.copy(pos); f.m.material.color.set(color); f.m.material.opacity = 0.7;
    f.m.scale.setScalar(radius * 0.12); f.m.visible = true;
  }

  // 레이저 볼트 그리기: 매 프레임 beginBolts → bolt()* → endBolts
  beginBolts() { this._bi = 0; }
  // 굵고 불투명한 색 막대 (흰색을 조금 섞어 뜨겁게)
  bolt(pos, dir, len, color, width = 0.3) {
    if (this._bi >= MAXB) return;
    _q.setFromUnitVectors(Z, dir);
    _m.compose(pos, _q, _s.set(width, width, len));
    this.bolts.setMatrixAt(this._bi, _m);
    this.bolts.setColorAt(this._bi, _c.set(color).lerp(WHITE, 0.08));
    this._bi++;
  }
  endBolts() {
    this.bolts.count = this._bi;
    this.bolts.visible = this._bi > 0;   // 날아가는 탄이 없으면 드로우 콜을 아낀다
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
  }

  update(dt, camera, viewH) {
    const scale = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.glow.update(dt, scale);
    this.smokeP.update(dt, scale);
    if (this.lastBlast) this.lastBlast.t += dt;
    if (this.later && this.later.length) { for (const e of this.later) e.t -= dt; const due = this.later.filter((e) => e.t <= 0); this.later = this.later.filter((e) => e.t > 0); for (const e of due) e.f(); }

    for (const f of this.flashes) {
      if (!f.on) continue;
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { f.on = false; f.m.visible = false; continue; }
      f.m.scale.setScalar(f.radius * (0.3 + k * 0.9));
      f.m.material.opacity = 0.85 * (1 - k);
    }
    for (const f of this.rings) {
      if (!f.on) continue;
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { f.on = false; f.m.visible = false; continue; }
      const e = 1 - (1 - k) * (1 - k);        // 빠르게 퍼졌다가 느려짐
      f.m.scale.setScalar(f.radius * (0.12 + 0.88 * e));
      f.m.material.opacity = 0.7 * (1 - k) * (1 - k);
      f.m.quaternion.copy(camera.quaternion);
    }
    // 잔해
    let n = 0;
    for (const d of this.debris) {
      if (!d.on) continue;
      d.life -= dt;
      if (d.life <= 0) { d.on = false; continue; }
      d.v.y -= 18 * dt; d.v.multiplyScalar(1 - 0.6 * dt);
      d.p.addScaledVector(d.v, dt);
      d.q.multiply(_q.setFromAxisAngle(d.ax, d.spin * dt));
      const k = Math.min(1, d.life / 0.35);
      _m.compose(d.p, d.q, _s.setScalar(d.size * k));
      this.deb.setMatrixAt(n, _m);
      this.deb.setColorAt(n, d.col);
      if (d.hot && Math.random() < dt * 22) this.glow.spawn(d.p.x, d.p.y, d.p.z, 0, 0.4, 0, 1, 0.55, 0.2, 0.35, d.size * 1.2, -0.2, 0.8);   // 불붙은 조각의 불씨 꼬리
      n++;
    }
    if (n || this.deb.count) {
      this.deb.count = n;
      this.deb.instanceMatrix.needsUpdate = true;
      if (this.deb.instanceColor) this.deb.instanceColor.needsUpdate = true;
    }
    this.deb.visible = n > 0;   // 개수 0 인 인스턴스도 드로우 콜을 쓰므로 숨긴다
    this._wreckUpdate(dt);
  }

  // 잔해 덩어리: 중력 · 지형/건물 튕김 · 멈춘 뒤 연기 · 끝에 가라앉으며 작아진다
  _wreckUpdate(dt) {
    let n = 0;
    const col = this.col;
    for (const d of this.wrecks) {
      if (!d.on) continue;
      d.life -= dt;
      if (d.life <= 0) { d.on = false; continue; }
      const r = d.size * 0.4;
      if (!d.rest) {
        d.v.y -= 20 * dt; d.v.multiplyScalar(1 - 0.25 * dt);
        d.p.addScaledVector(d.v, dt);
        d.q.multiply(_q.setFromAxisAngle(d.ax, d.spin * dt));
        let hit = false;
        if (col) { if (col.querySphere(d.p, r, _hitW)) { hit = true; d.p.addScaledVector(_hitW.normal, _hitW.depth); } }
        else if (d.p.y < r) { hit = true; d.p.y = r; _hitW.normal.set(0, 1, 0); }
        if (hit) {
          const vn = d.v.dot(_hitW.normal);
          if (vn < 0) d.v.addScaledVector(_hitW.normal, -1.45 * vn);     // 튕김 (반발 0.45)
          d.v.multiplyScalar(0.55); d.spin *= 0.5; d.bounce++;
          if (d.bounce === 1 && d.hot) this.burst(d.p, 0xffa040, 4, 4, 0.35, 0.14, 10);   // 첫 충돌 불똥
          if (d.v.lengthSq() < 2.5 || d.bounce > 4) { d.rest = true; d.v.set(0, 0, 0); }
        }
      }
      // 연기: 불붙은 조각은 진하게, 오래. 날아가는 동안은 짧은 꼬리
      if ((d.smokeT -= dt) <= 0) {
        const left = d.life / d.max;
        d.smokeT = d.rest ? 0.28 + (1 - left) * 0.5 : 0.07;
        if (d.hot || !d.rest) this.smoke(d.p, d.rest ? 0.9 + d.size : 0.45 + d.size * 0.5, d.rest ? 2.2 : 0.8, d.hot ? 0.07 : 0.16, 0.3);
        if (d.hot && !d.rest && Math.random() < 0.6) this.glow.spawn(d.p.x, d.p.y, d.p.z, 0, 0.3, 0, 1, 0.5, 0.18, 0.3, d.size * 0.9, -0.2, 0.8);
      }
      const k = Math.min(1, d.life / 0.8);   // 끝 0.8초: 가라앉으며 작아진다
      _s.copy(d.sc).multiplyScalar(d.size * k);
      if (d.rest && k < 1) d.p.y -= dt * 0.25;
      _m.compose(d.p, d.q, _s);
      this.wchunk.setMatrixAt(n, _m);
      this.wchunk.setColorAt(n, d.col);
      n++;
    }
    if (n || this.wchunk.count) {
      this.wchunk.count = n;
      this.wchunk.instanceMatrix.needsUpdate = true;
      if (this.wchunk.instanceColor) this.wchunk.instanceColor.needsUpdate = true;
    }
    this.wchunk.visible = n > 0;
    this._hullUpdate(dt);
  }

  _hullUpdate(dt) {
    let n = 0;
    const col = this.col;
    for (const d of this.hulls) {
      if (!d.on) continue;
      d.t += dt;
      if (d.t >= d.life) { d.on = false; continue; }
      const R = d.size * 0.7;
      if (!d.rest) {
        d.v.y -= 22 * dt; d.v.multiplyScalar(1 - 0.3 * dt);
        d.p.addScaledVector(d.v, dt);
        d.q.premultiply(_q.setFromAxisAngle(d.ax, d.spin * dt));
        let hit = false;
        if (col) { if (col.querySphere(d.p, R, _hitW)) { hit = true; d.p.addScaledVector(_hitW.normal, _hitW.depth); } }
        else if (d.p.y < R) { hit = true; d.p.y = R; _hitW.normal.set(0, 1, 0); }
        if (hit) {
          const vn = d.v.dot(_hitW.normal); if (vn < 0) d.v.addScaledVector(_hitW.normal, -1.35 * vn);
          d.v.multiplyScalar(0.45); d.spin *= 0.45; d.hits++;
          if (d.hits === 1) {   // 땅에 처박힘: 작은 2차 폭발과 덩어리 몇 개
            this.explosion(d.p, 0.45 + d.size * 0.12);
            this.wreckBurst(d.p, d.col.getHex(), 2, 6, 0.3 + d.size * 0.25);
            if (this.onWreckHit) this.onWreckHit(d.p, d.size);
          }
          if (d.v.lengthSq() < 4 || d.hits > 3) { d.rest = true; d.v.set(0, 0, 0); }
        }
      }
      if ((d.smokeT -= dt) <= 0) {   // 떨어지는 동안은 진한 꼬리와 불, 멈춘 뒤에는 피어오르는 연기 기둥
        d.smokeT = d.rest ? 0.16 : 0.045;
        this.smoke(d.p, (d.rest ? 1.3 : 0.9) * d.size, d.rest ? 2.2 : 1.5, 0.07, d.size * 0.6);
        if (!d.rest || Math.random() < 0.55) this.puff(d.p, 0xff7a2a, (d.rest ? 0.3 : 0.45) * d.size, d.rest ? 0.5 : 0.35, 0.4);   // 멈춘 뒤에도 불씨가 남아 어두운 곳에서 보인다
      }
      const end = d.life - d.t;
      let k = 1;
      if (end < 0.9) { k = Math.max(0.02, end / 0.9); d.p.y -= dt * R * 0.8; }   // 끝: 가라앉으며 작아진다
      _m.compose(d.p, d.q, _s.setScalar(d.size * k));
      this.hull.setMatrixAt(n, _m);
      this.hull.setColorAt(n, d.col);
      n++;
    }
    if (n || this.hull.count) {
      this.hull.count = n;
      this.hull.instanceMatrix.needsUpdate = true;
      if (this.hull.instanceColor) this.hull.instanceColor.needsUpdate = true;
    }
    this.hull.visible = n > 0;
  }

  dispose() {
    this.glow.dispose(); this.smokeP.dispose();
    this.scene.remove(this.glow.points, this.smokeP.points, this.bolts);
    this.boltGeo.dispose(); this.boltMat.dispose(); this.bolts.dispose();
    for (const f of this.flashes) { this.scene.remove(f.m); f.m.material.dispose(); }
    for (const f of this.rings) { this.scene.remove(f.m); f.m.material.dispose(); }
    this.flashGeo.dispose(); this.ringGeo.dispose();
    this.scene.remove(this.deb); this.debGeo.dispose(); this.debMat.dispose(); this.deb.dispose();
    this.scene.remove(this.wchunk, this.hull); this.wGeo.dispose(); this.hGeo.dispose(); this.wMat.dispose(); this.wchunk.dispose(); this.hull.dispose();
  }
}
