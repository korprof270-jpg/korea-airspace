// 전장 분위기: 먼 곳에서 벌어지는 다른 교전(총구 섬광·예광탄·폭발), 멀리 피어오르는 연기 기둥, 적이 떨어진 자리에 남는 불타는 잔해
// 드로우 콜 3번(연기 Points · 빛 Points · 예광탄 LineSegments)으로 끝난다. 연기는 셰이더가 시간만으로 움직이므로 프레임마다 버퍼를 고치지 않는다
// 그래픽 단계(game.q)에 따라 규모가 줄고, 온라인 경기(cfg.net)·PvP·경기장 모드에서는 만들지 않는다
import * as THREE from "../vendor/three.module.min.js";
import { settings } from "./config.js";

const VACUUM = new Set(["orbit", "moon"]);            // 연기가 피어오르지 않는 맵 (진공)
const NO_WAR = new Set(["stadium"]);                  // 경기장: 전쟁 분위기가 어울리지 않는다
const Q = {
  low: { fights: 1, cols: 2, colN: 12, wrecks: 4, wreckN: 8, glow: 40, tracers: 10 },
  med: { fights: 2, cols: 4, colN: 18, wrecks: 6, wreckN: 11, glow: 72, tracers: 22 },
  high: { fights: 3, cols: 6, colN: 24, wrecks: 8, wreckN: 14, glow: 110, tracers: 36 },
};
const WRECK_LIFE = 38;
const _v = new THREE.Vector3(), _c = new THREE.Color();
const rnd = (a, b) => a + Math.random() * (b - a);

// 이 모드에서 분위기를 켤지
export function ambienceWanted(mode) {
  const cfg = mode.cfg || {}, s = mode.s;
  if (cfg.net || cfg.pvp || cfg.mode === "pvp" || cfg.mode === "aos" || cfg.variant === "aos") return false;
  if (NO_WAR.has(s.map && s.map.id)) return false;
  return !(settings.fx && settings.fx.ambience === false);
}

export class Ambience {
  constructor(mode) {
    this.mode = mode; this.s = mode.s; this.w = mode.s.world;
    const q = (this.q = Q[mode.s.game.q] || Q.med);
    this.t = 0;
    this.vacuum = VACUUM.has(this.s.map.id);
    this.night = !!this.w.night;
    const fog = this.w.scene.fog;
    this.fogNear = fog ? fog.near : 400; this.fogFar = fog ? fog.far : 1200;
    this.fogCol = fog ? fog.color : new THREE.Color(0x9fb3c8);
    // 먼 교전이 벌어질 거리: 안개와 카메라 시야 끝 안쪽
    const far = Math.min(this.fogFar * 0.85, (this.s.camera.far || 2000) * 0.8, 750);
    this.dMax = Math.max(160, far); this.dMin = Math.min(200, this.dMax * 0.5);

    // ── 1) 연기 (연기 기둥 + 잔해 연기): 정적 속성 + 시간 유니폼 ──
    const nCol = this.vacuum ? 0 : q.cols, nW = this.vacuum ? 0 : q.wrecks;
    this.colN = q.colN; this.wreckN = q.wreckN;
    const NS = nCol * q.colN + nW * q.wreckN;
    this.NS = NS;
    if (NS > 0) {
      const sg = (this.smokeGeo = new THREE.BufferGeometry());
      this.sPos = new Float32Array(NS * 3); this.sA = new Float32Array(NS * 4); this.sB = new Float32Array(NS * 3);
      sg.setAttribute("position", new THREE.BufferAttribute(this.sPos, 3));
      sg.setAttribute("aP", new THREE.BufferAttribute(this.sA, 4));     // 위상 · 주기(초) · 높이 · 폭
      sg.setAttribute("aB", new THREE.BufferAttribute(this.sB, 3));     // 생긴 시각 · 수명 · 밝기
      for (let i = 0; i < NS; i++) this.sB[i * 3 + 1] = -1;              // 수명 < 0: 꺼짐
      const tint = this.night ? new THREE.Color(0x1c1e24) : new THREE.Color(0x3a3a3e);
      this.smokeMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uT: { value: 0 }, scale: { value: 600 }, uWind: { value: new THREE.Vector2(rnd(-1, 1), rnd(-1, 1)).normalize() },
          fogC: { value: this.fogCol }, fogN: { value: this.fogNear }, fogF: { value: this.fogFar }, tint: { value: tint } },
        vertexShader: `attribute vec4 aP; attribute vec3 aB; uniform float uT, scale; uniform vec2 uWind; uniform float fogN, fogF;
          varying float vA; varying float vF; varying float vH;
          void main(){
            float life = aB.y; float on = step(0.0, life);
            float age = fract(uT / aP.y + aP.x);
            float fade = life > 1e5 ? 1.0 : clamp((aB.x + life - uT) / 8.0, 0.0, 1.0) * clamp((uT - aB.x) * 0.8, 0.0, 1.0);
            vec3 p = position;
            float h = aP.z * age;
            p.y += h;
            p.xz += uWind * h * 0.45 + vec2(sin(uT * 0.4 + aP.x * 40.0), cos(uT * 0.33 + aP.x * 23.0)) * aP.w * 0.25 * age;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float d = max(0.1, -mv.z);
            float sz = aP.w * (0.35 + 1.5 * age);
            gl_PointSize = on * max(1.0, sz * scale / d);
            gl_Position = projectionMatrix * mv;
            vA = on * fade * smoothstep(0.0, 0.1, age) * (1.0 - age * age) * aB.z;
            vF = smoothstep(fogN, fogF, d); vH = age;
          }`,
        fragmentShader: `varying float vA; varying float vF; varying float vH; uniform vec3 fogC, tint;
          void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, r) * vA * 0.95;
            if (a < 0.003) discard;
            vec3 c = mix(tint * (1.0 + vH * 0.6), fogC, vF * 0.85);
            gl_FragColor = vec4(c, a * (1.0 - vF * 0.55)); }`,
      });
      this.smoke = new THREE.Points(sg, this.smokeMat);
      this.smoke.frustumCulled = false; this.smoke.renderOrder = 18;
      this.w.scene.add(this.smoke);
    }
    this.cols = [];
    for (let i = 0; i < nCol; i++) this._placeColumn(i);
    this.wrecks = []; this.wreckI = 0; this.nW = nW || q.wrecks;   // 진공 맵: 연기 없이 불씨만

    // ── 2) 빛 (먼 섬광·폭발·잔해 불씨): CPU 가 갱신하는 작은 풀 ──
    const NF = this.nW * 2 + nCol;                 // 고정 칸: 잔해 불씨 2개씩 + 연기 기둥 밑동의 불빛
    this.NF = NF; const NG = NF + q.glow; this.NG = NG;
    this.gPos = new Float32Array(NG * 3); this.gCol = new Float32Array(NG * 4); this.gSize = new Float32Array(NG);
    this.gVel = new Float32Array(NG * 3); this.gLife = new Float32Array(NG); this.gMax = new Float32Array(NG);
    this.gS0 = new Float32Array(NG); this.gGrow = new Float32Array(NG); this.gBase = new Float32Array(NG * 3); this.gGrav = new Float32Array(NG);
    this.gCur = 0;
    const gg = (this.glowGeo = new THREE.BufferGeometry());
    gg.setAttribute("position", new THREE.BufferAttribute(this.gPos, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute("pcolor", new THREE.BufferAttribute(this.gCol, 4).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute("psize", new THREE.BufferAttribute(this.gSize, 1).setUsage(THREE.DynamicDrawUsage));
    // 일반 혼합 + HDR 색: 밝은 낮 하늘 위에서도 보이고(가산 혼합은 묻힌다), 밤에는 1 을 넘는 색이 블룸으로 번진다. 어두운 연기 덩이도 같은 풀에 그린다
    this.glowMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { scale: { value: 600 } },
      vertexShader: `attribute vec4 pcolor; attribute float psize; varying vec4 vC; uniform float scale;
        void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize > 0.0 ? max(1.5, psize * scale / max(0.1, -mv.z)) : 0.0; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec4 vC; void main(){ float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d), core = smoothstep(0.22, 0.0, d); if (a * vC.a < 0.004) discard;
        float hot = step(0.3, max(vC.r, max(vC.g, vC.b)));   // 어두운 색 = 연기 덩이 (빛나지 않음)
        gl_FragColor = vec4(vC.rgb * (1.0 + hot * (1.6 + core * 2.0)), min(1.0, a * vC.a * (1.0 + hot * core))); }`,
    });
    this.glow = new THREE.Points(gg, this.glowMat);
    this.glow.frustumCulled = false; this.glow.renderOrder = 21;
    this.w.scene.add(this.glow);

    // ── 3) 예광탄: 짧은 선분, 가산 혼합 (색을 거리로 미리 줄인다) ──
    const NT = (this.NT = q.tracers);
    this.tPos = new Float32Array(NT * 6); this.tCol = new Float32Array(NT * 8);
    this.tr = []; for (let i = 0; i < NT; i++) this.tr.push({ life: 0, max: 1, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, len: 8, sp: 150, r: 1, g: 1, b: 1 });
    this.tCur = 0;
    const tg = (this.trGeo = new THREE.BufferGeometry());
    tg.setAttribute("position", new THREE.BufferAttribute(this.tPos, 3).setUsage(THREE.DynamicDrawUsage));
    tg.setAttribute("color", new THREE.BufferAttribute(this.tCol, 4).setUsage(THREE.DynamicDrawUsage));   // rgba: 머리는 진하고 꼬리는 투명
    this.trMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, toneMapped: false });
    this.trLines = new THREE.LineSegments(tg, this.trMat);
    this.trLines.frustumCulled = false; this.trLines.renderOrder = 21;
    this.w.scene.add(this.trLines);

    // 먼 교전 무리
    this.fights = [];
    for (let i = 0; i < q.fights; i++) this.fights.push(this._newFight(rnd(0, 6)));
  }

  // 카메라에서 d 만큼 떨어진 맵 안의 한 점 (높이는 지면 + lift)
  _farPoint(dMin, dMax, lift0, lift1, out) {
    const cam = this.s.camera.position, lim = this.w.size + 180;
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * Math.PI * 2, d = rnd(dMin, dMax);
      const x = Math.max(-lim, Math.min(lim, cam.x + Math.cos(a) * d)), z = Math.max(-lim, Math.min(lim, cam.z + Math.sin(a) * d));
      if (Math.hypot(x - cam.x, z - cam.z) < dMin * 0.8 && k < 7) continue;
      out.set(x, this.w.h(x, z) + rnd(lift0, lift1), z);
      if (out.y > this.w.ceiling + 220) out.y = this.w.ceiling + 220;
      return out;
    }
    return out.set(cam.x + dMax, cam.y + lift0, cam.z);
  }

  _placeColumn(i) {
    const p = this._farPoint(Math.max(120, this.dMin * 0.7), this.dMax * 0.95, 0, 0, new THREE.Vector3());
    const H = rnd(70, 130), W = rnd(16, 26), per = rnd(9, 14), n = this.colN, o = i * n;
    for (let k = 0; k < n; k++) this._smokeP(o + k, p.x + rnd(-2, 2), p.y, p.z + rnd(-2, 2), k / n + rnd(0, 0.05), per, H * rnd(0.85, 1.1), W * rnd(0.8, 1.2), -1e9, 1e9, rnd(0.75, 1.05));
    this.cols.push({ pos: p });
    this.smokeGeo.attributes.position.needsUpdate = true; this.smokeGeo.attributes.aP.needsUpdate = true; this.smokeGeo.attributes.aB.needsUpdate = true;
  }
  _smokeP(i, x, y, z, ph, per, H, W, born, life, br) {
    this.sPos[i * 3] = x; this.sPos[i * 3 + 1] = y; this.sPos[i * 3 + 2] = z;
    this.sA[i * 4] = ph; this.sA[i * 4 + 1] = per; this.sA[i * 4 + 2] = H; this.sA[i * 4 + 3] = W;
    this.sB[i * 3] = born; this.sB[i * 3 + 1] = life; this.sB[i * 3 + 2] = br;
  }

  // 적이 떨어진 자리: 땅 위에 불타는 잔해 (오래 남았다가 사그라든다)
  wreck(pos, big = 1) {
    const w = this.w, lim = w.size + 40;
    if (Math.abs(pos.x) > lim || Math.abs(pos.z) > lim) return;
    const gy = w.h(pos.x, pos.z);
    if (!isFinite(gy) || pos.y - gy > 160 || pos.y < gy - 5) return;
    // 이미 가까이 잔해가 있으면 그 불을 다시 키운다
    for (const r of this.wrecks) if (r.on && Math.hypot(r.x - pos.x, r.z - pos.z) < 6) { r.t0 = this.t; r.big = Math.max(r.big, big); this._wreckSmoke(r); return; }
    const i = this.wreckI; this.wreckI = (i + 1) % this.nW;
    const r = this.wrecks[i] || (this.wrecks[i] = { i });
    Object.assign(r, { on: true, x: pos.x, y: gy + 0.4, z: pos.z, t0: this.t, big: Math.min(3, big), ph: Math.random() * 10 });
    this._wreckSmoke(r);
  }
  _wreckSmoke(r) {
    if (!this.smoke) return;
    const n = this.wreckN, o = this.cols.length * this.colN + r.i * n, W = 4 + r.big * 2, H = 18 + r.big * 9;
    for (let k = 0; k < n; k++) this._smokeP(o + k, r.x + rnd(-0.6, 0.6), r.y, r.z + rnd(-0.6, 0.6), k / n, rnd(4.5, 6.5), H * rnd(0.8, 1.15), W * rnd(0.8, 1.2), this.t, WRECK_LIFE, rnd(0.7, 0.95));
    const a = this.smokeGeo.attributes;
    a.position.needsUpdate = true; a.aP.needsUpdate = true; a.aB.needsUpdate = true;
  }

  _newFight(delay = 0) {
    const sky = Math.random() < 0.35;
    const p = this._farPoint(this.dMin, this.dMax, sky ? 110 : 35, sky ? 200 : 110, new THREE.Vector3());
    const a = Math.random() * Math.PI * 2;
    return { pos: p, axis: new THREE.Vector3(Math.cos(a), rnd(-0.2, 0.2), Math.sin(a)).normalize(), t: -delay, life: rnd(9, 18), ev: 0, boom: rnd(1.5, 4), drift: new THREE.Vector3(rnd(-6, 6), rnd(-1, 1), rnd(-6, 6)) };
  }

  _glow(x, y, z, vx, vy, vz, col, life, size, grow = 0, grav = 0) {
    const i = this.NF + this.gCur; this.gCur = (this.gCur + 1) % (this.NG - this.NF);
    this.gPos[i * 3] = x; this.gPos[i * 3 + 1] = y; this.gPos[i * 3 + 2] = z;
    this.gVel[i * 3] = vx; this.gVel[i * 3 + 1] = vy; this.gVel[i * 3 + 2] = vz;
    _c.setHex(col); this.gBase[i * 3] = _c.r; this.gBase[i * 3 + 1] = _c.g; this.gBase[i * 3 + 2] = _c.b;
    this.gLife[i] = this.gMax[i] = life; this.gS0[i] = size; this.gGrow[i] = grow; this.gGrav[i] = grav;
  }
  _tracer(x, y, z, dx, dy, dz, col) {
    const t = this.tr[this.tCur]; this.tCur = (this.tCur + 1) % this.NT;
    _c.setHex(col);
    Object.assign(t, { life: rnd(0.18, 0.32), x, y, z, dx, dy, dz, len: rnd(16, 28), sp: rnd(150, 220), r: _c.r, g: _c.g, b: _c.b });
    t.max = t.life;
  }

  // 한 교전 무리의 사건: 총구 섬광 + 예광탄, 가끔 폭발
  _fightStep(f, dt) {
    f.t += dt;
    if (f.t < 0) return;
    f.pos.addScaledVector(f.drift, dt);
    if ((f.ev -= dt) <= 0) {
      f.ev = rnd(0.05, 0.28);
      const side = Math.random() < 0.5 ? 1 : -1, ax = f.axis;
      // 양 진영이 축을 따라 마주 보고 쏜다
      const x = f.pos.x + ax.x * side * rnd(10, 30) + rnd(-12, 12), y = f.pos.y + rnd(-10, 10), z = f.pos.z + ax.z * side * rnd(10, 30) + rnd(-12, 12);
      const col = side > 0 ? 0x7fc4ff : 0xff6a4a;
      _v.set(-ax.x * side + rnd(-0.35, 0.35), ax.y * -side + rnd(-0.2, 0.2), -ax.z * side + rnd(-0.35, 0.35)).normalize();
      this._glow(x, y, z, 0, 0, 0, side > 0 ? 0xbfe4ff : 0xffc080, rnd(0.12, 0.2), rnd(8, 12));   // 먼 거리라 실제보다 크게
      this._tracer(x, y, z, _v.x, _v.y, _v.z, col);
      if (Math.random() < 0.45) this._tracer(x + rnd(-2, 2), y + rnd(-2, 2), z + rnd(-2, 2), _v.x, _v.y, _v.z, col);
    }
    if ((f.boom -= dt) <= 0) {
      f.boom = rnd(1.2, 3.8);
      const x = f.pos.x + rnd(-25, 25), y = f.pos.y + rnd(-12, 12), z = f.pos.z + rnd(-25, 25), big = Math.random() < 0.25;
      this._glow(x, y, z, 0, 0, 0, 0xfff0c0, 0.3, big ? 30 : 20, 0.8);
      this._glow(x, y, z, 0, 1.5, 0, 0xff8a2a, big ? 1.4 : 1, big ? 36 : 24, 0.6);
      // 폭발 뒤 남는 검은 연기 덩이 (낮에도 잘 보인다)
      if (!this.vacuum) this._glow(x, y + 2, z, rnd(-1, 1), 2.5, rnd(-1, 1), this.night ? 0x141418 : 0x2a2a2e, rnd(2.5, 3.5), big ? 18 : 12, 1.6);
      // 떨어지는 불씨 (격추된 기체)
      if (Math.random() < 0.6) this._glow(x, y, z, rnd(-6, 6), rnd(0, 4), rnd(-6, 6), 0xff9a3a, rnd(1.8, 2.8), 7, -0.4, 14);
    }
    if (f.t > f.life) Object.assign(f, this._newFight(rnd(0.5, 4)));
  }

  update(dt) {
    if (dt <= 0) return;
    this.t += dt;
    const cam = this.s.camera, cp = cam.position, scale = this.s.hud.H / (2 * Math.tan((cam.fov * Math.PI) / 360));
    if (this.smoke) { this.smokeMat.uniforms.uT.value = this.t; this.smokeMat.uniforms.scale.value = scale; }
    this.glowMat.uniforms.scale.value = scale;
    const live = this.mode.state !== "done";
    if (live) for (const f of this.fights) this._fightStep(f, dt);
    const fogK = (x, y, z) => { const d = Math.hypot(x - cp.x, y - cp.y, z - cp.z); return 1 - 0.75 * Math.min(1, Math.max(0, (d - this.fogNear) / (this.fogFar - this.fogNear))); };

    // 고정 칸: 잔해 불씨 (깜빡임) · 연기 기둥 밑동 불빛
    const P = this.gPos, C = this.gCol, S = this.gSize;
    for (let k = 0; k < this.nW; k++) {
      const r = this.wrecks[k];
      for (let j = 0; j < 2; j++) {
        const i = k * 2 + j;
        if (!r || !r.on) { S[i] = 0; continue; }
        const age = this.t - r.t0, fade = Math.min(1, age * 3) * Math.max(0, Math.min(1, (WRECK_LIFE - age) / 10));
        if (fade <= 0) { r.on = false; S[i] = 0; continue; }
        const fl = 0.7 + 0.3 * Math.sin(this.t * (9 + j * 4) + r.ph + j) * Math.sin(this.t * 5.3 + r.ph * 2);
        P[i * 3] = r.x + (j ? 0.6 : -0.4); P[i * 3 + 1] = r.y + (j ? 0.9 : 0.3) + fl * 0.3; P[i * 3 + 2] = r.z + (j ? -0.3 : 0.4);
        const f2 = fade * fl * (age < 1.5 ? 1.4 : 1);
        C[i * 4] = 1; C[i * 4 + 1] = j ? 0.62 : 0.42; C[i * 4 + 2] = j ? 0.25 : 0.12; C[i * 4 + 3] = f2;
        S[i] = (2.4 + r.big * 1.2) * (j ? 1.5 : 2.3) * (0.85 + 0.25 * fl);
      }
    }
    for (let k = 0; k < this.cols.length; k++) {
      const i = this.nW * 2 + k, p = this.cols[k].pos, fl = 0.75 + 0.25 * Math.sin(this.t * 7 + k * 3) * Math.sin(this.t * 3.1 + k);
      P[i * 3] = p.x; P[i * 3 + 1] = p.y + 2; P[i * 3 + 2] = p.z;
      C[i * 4] = 1; C[i * 4 + 1] = 0.5; C[i * 4 + 2] = 0.18; C[i * 4 + 3] = fl * fogK(p.x, p.y, p.z) * 0.9;
      S[i] = 9 * fl;
    }
    // 움직이는 빛
    for (let i = this.NF; i < this.NG; i++) {
      if (this.gLife[i] <= 0) { S[i] = 0; continue; }
      this.gLife[i] -= dt;
      const k = Math.max(0, this.gLife[i] / this.gMax[i]), j = i * 3, V = this.gVel;
      V[j + 1] -= this.gGrav[i] * dt;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      const fk = fogK(P[j], P[j + 1], P[j + 2]);
      C[i * 4] = this.gBase[j]; C[i * 4 + 1] = this.gBase[j + 1]; C[i * 4 + 2] = this.gBase[j + 2]; C[i * 4 + 3] = k * fk;
      S[i] = this.gLife[i] > 0 ? this.gS0[i] * (1 + this.gGrow[i] * (1 - k)) : 0;
    }
    const ga = this.glowGeo.attributes;
    ga.position.needsUpdate = true; ga.pcolor.needsUpdate = true; ga.psize.needsUpdate = true;

    // 예광탄
    const TP = this.tPos, TC = this.tCol;
    let any = false;
    for (let i = 0; i < this.NT; i++) {
      const t = this.tr[i], o = i * 6;
      const oc = i * 8;
      if (t.life <= 0) { if (TC[oc + 3]) { TC.fill(0, oc, oc + 8); any = true; } continue; }
      t.life -= dt; any = true;
      t.x += t.dx * t.sp * dt; t.y += t.dy * t.sp * dt; t.z += t.dz * t.sp * dt;
      const a = Math.max(0, t.life / t.max) * fogK(t.x, t.y, t.z);
      TP[o] = t.x; TP[o + 1] = t.y; TP[o + 2] = t.z;
      TP[o + 3] = t.x - t.dx * t.len; TP[o + 4] = t.y - t.dy * t.len; TP[o + 5] = t.z - t.dz * t.len;
      TC[oc] = t.r * 2.2; TC[oc + 1] = t.g * 2.2; TC[oc + 2] = t.b * 2.2; TC[oc + 3] = a;
      TC[oc + 4] = t.r; TC[oc + 5] = t.g; TC[oc + 6] = t.b; TC[oc + 7] = 0;
    }
    if (any) { this.trGeo.attributes.position.needsUpdate = true; this.trGeo.attributes.color.needsUpdate = true; }
  }

  dispose() {
    const sc = this.w.scene;
    if (this.smoke) { sc.remove(this.smoke); this.smokeGeo.dispose(); this.smokeMat.dispose(); }
    sc.remove(this.glow); this.glowGeo.dispose(); this.glowMat.dispose();
    sc.remove(this.trLines); this.trGeo.dispose(); this.trMat.dispose();
  }
}
