// 시각 효과: 파티클(폭발·스파크·총구 섬광·연기), 섬광 구, 충격파 고리, 레이저 볼트 인스턴스 — 모두 풀링
import * as THREE from "../vendor/three.module.min.js";

const MAXP = 2400;   // 빛나는(가산 혼합) 파티클
const MAXS = 420;    // 연기(일반 혼합) 파티클
const MAXB = 640;
const WHITE = new THREE.Color(0xffffff);
const NFLASH = 14;
const NRING = 10;
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
  }

  // 사방으로 퍼지는 파티클
  burst(pos, color, count = 20, speed = 8, life = 0.6, size = 0.3, grav = 6) {
    _c.set(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = speed * (0.3 + Math.random() * 0.7);
      this.glow.spawn(pos.x, pos.y, pos.z, Math.cos(a) * s * v, u * v, Math.sin(a) * s * v, _c.r, _c.g, _c.b,
        life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), grav);
    }
  }

  // dir 방향 원뿔로 튀는 파티클 (명중 불꽃·총구 화염)
  cone(pos, dir, color, count, speed, spread, life, size, grav = 0) {
    _c.set(color);
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
    const n = Math.min(14, Math.round(5 + 3 * scale));
    for (let i = 0; i < n; i++) this.smoke(pos, 1.5 * scale, 1.7, 0.1, 2.4 * scale);
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
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
  }

  update(dt, camera, viewH) {
    const scale = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    this.glow.update(dt, scale);
    this.smokeP.update(dt, scale);

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
  }

  dispose() {
    this.glow.dispose(); this.smokeP.dispose();
    this.scene.remove(this.glow.points, this.smokeP.points, this.bolts);
    this.boltGeo.dispose(); this.boltMat.dispose(); this.bolts.dispose();
    for (const f of this.flashes) { this.scene.remove(f.m); f.m.material.dispose(); }
    for (const f of this.rings) { this.scene.remove(f.m); f.m.material.dispose(); }
    this.flashGeo.dispose(); this.ringGeo.dispose();
  }
}
