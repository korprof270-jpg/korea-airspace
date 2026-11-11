// 시각 효과: 파티클(폭발·스파크·연기 꼬리), 섬광, 레이저 볼트 인스턴스
import * as THREE from "../vendor/three.module.min.js";

const MAXP = 2400;
const MAXB = 256;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

export class FX {
  constructor(scene) {
    this.scene = scene;
    // 파티클
    this.p = { pos: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 4), size: new Float32Array(MAXP) };
    this.vel = new Float32Array(MAXP * 3);
    this.life = new Float32Array(MAXP);
    this.maxLife = new Float32Array(MAXP);
    this.grav = new Float32Array(MAXP);
    this.size0 = new Float32Array(MAXP);
    this.grow = new Float32Array(MAXP);
    this.base = new Float32Array(MAXP * 3);
    this.cursor = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.p.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("pcolor", new THREE.BufferAttribute(this.p.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("psize", new THREE.BufferAttribute(this.p.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.pmat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float scale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = psize * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC.rgb * a * vC.a * 1.7, a * vC.a); }`,
    });
    this.points = new THREE.Points(g, this.pmat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);

    // 레이저 볼트 (인스턴스)
    this.boltGeo = new THREE.BoxGeometry(0.07, 0.07, 1);
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.2, 3.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.bolts = new THREE.InstancedMesh(this.boltGeo, this.boltMat, MAXB);
    this.bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bolts.frustumCulled = false;
    this.bolts.count = 0;
    this.bolts.setColorAt(0, _c.set(0xffffff));
    scene.add(this.bolts);

    // 섬광 구
    this.flashes = [];
    this.flashGeo = new THREE.SphereGeometry(1, 12, 8);
  }

  _spawn(x, y, z, vx, vy, vz, r, g, b, life, size, grav = 0, grow = 0) {
    const i = this.cursor;
    this.cursor = (i + 1) % MAXP;
    this.p.pos[i * 3] = x; this.p.pos[i * 3 + 1] = y; this.p.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.base[i * 3] = r; this.base[i * 3 + 1] = g; this.base[i * 3 + 2] = b;
    this.life[i] = this.maxLife[i] = life;
    this.size0[i] = size; this.grav[i] = grav; this.grow[i] = grow;
  }

  // 사방으로 퍼지는 파티클
  burst(pos, color, count = 20, speed = 8, life = 0.6, size = 0.3, grav = 6) {
    _c.set(color);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = Math.sqrt(1 - u * u), v = speed * (0.3 + Math.random() * 0.7);
      this._spawn(pos.x, pos.y, pos.z, Math.cos(a) * s * v, u * v, Math.sin(a) * s * v, _c.r, _c.g, _c.b,
        life * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8), grav);
    }
  }

  // 한 점에서 천천히 퍼지는 꼬리(연기·미사일)
  puff(pos, color, size = 0.25, life = 0.7, jitter = 0.4) {
    _c.set(color);
    this._spawn(pos.x, pos.y, pos.z, (Math.random() - 0.5) * jitter, (Math.random() - 0.5) * jitter + 0.2, (Math.random() - 0.5) * jitter,
      _c.r, _c.g, _c.b, life, size, -0.3, 1.2);
  }

  explosion(pos, scale = 1) {
    this.burst(pos, 0xffb040, Math.round(46 * scale), 14 * scale, 0.7, 0.9 * scale, 4);
    this.burst(pos, 0xff4a1a, Math.round(30 * scale), 7 * scale, 1.0, 1.3 * scale, 1);
    this.burst(pos, 0xffffff, Math.round(14 * scale), 22 * scale, 0.35, 0.35 * scale, 9);
    this.flash(pos, 0xffd9a0, 3.2 * scale, 0.28);
  }

  spark(pos, color = 0xffd27a, n = 8) { this.burst(pos, color, n, 6, 0.3, 0.16, 12); }

  flash(pos, color, radius, life) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(this.flashGeo, mat);
    m.position.copy(pos);
    this.scene.add(m);
    this.flashes.push({ m, t: 0, life, radius });
  }

  // 레이저 볼트 그리기: 매 프레임 beginBolts → bolt()* → endBolts
  beginBolts() { this._bi = 0; }
  bolt(pos, dir, len, color) {
    if (this._bi >= MAXB) return;
    _q.setFromUnitVectors(Z, dir);
    _m.compose(pos, _q, _s.set(1, 1, len));
    this.bolts.setMatrixAt(this._bi, _m);
    this.bolts.setColorAt(this._bi, _c.set(color));
    this._bi++;
  }
  endBolts() {
    this.bolts.count = this._bi;
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
  }

  update(dt, camera, viewH) {
    const P = this.p.pos, C = this.p.col, S = this.p.size;
    for (let i = 0; i < MAXP; i++) {
      if (this.life[i] <= 0) { S[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      const drag = 1 - 1.8 * dt;
      this.vel[i * 3] *= drag; this.vel[i * 3 + 1] *= drag; this.vel[i * 3 + 2] *= drag;
      P[i * 3] += this.vel[i * 3] * dt; P[i * 3 + 1] += this.vel[i * 3 + 1] * dt; P[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      C[i * 4] = this.base[i * 3]; C[i * 4 + 1] = this.base[i * 3 + 1]; C[i * 4 + 2] = this.base[i * 3 + 2]; C[i * 4 + 3] = k;
      S[i] = this.size0[i] * (1 + this.grow[i] * (1 - k));
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.pcolor.needsUpdate = true;
    g.attributes.psize.needsUpdate = true;
    this.pmat.uniforms.scale.value = viewH / (2 * Math.tan((camera.fov * Math.PI) / 360));

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { this.scene.remove(f.m); f.m.material.dispose(); this.flashes.splice(i, 1); continue; }
      f.m.scale.setScalar(f.radius * (0.3 + k * 0.9));
      f.m.material.opacity = 0.85 * (1 - k);
    }
  }

  dispose() {
    this.points.geometry.dispose(); this.pmat.dispose();
    this.boltGeo.dispose(); this.boltMat.dispose(); this.flashGeo.dispose();
    for (const f of this.flashes) f.m.material.dispose();
  }
}
