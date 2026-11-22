// 대규모 전투의 기함 함대: 하늘 높이 아군(휴마 연합)과 적(에이아 기계 함대 · 에일 생체 함대) 기함들이 전열을 이루어 포격전을 벌인다
//  · 전열전: 두 함대는 서로 옆구리(현측)를 보이며 대열을 지키고, 남은 전력에 따라 전선(front)이 밀고 밀린다.
//    적 포대를 부수면 아군 함대가 전진한다. 크게 상한 함선은 뒤로 물러난다
//  · 아군 기함 = 움직이는 기지: 가까이(70 m) 있으면 체력·미사일이 천천히 찬다(보급 고리 · 보급 빔).
//    fleet.supportStrike(표적) — 아군 기함 함포 지원 사격(재사용 22초, 탄착 원으로 예고, 실제 피해). 락온을 오래 유지하거나 [G] 로 요청
//  · 적 기함 = 약점이 있는 보스: 정면 장갑은 피해를 크게 줄이고, 엔진(속도↓·고도↓)·포대(사격↓·아군 전진)·실드 발생기(코어 노출)를
//    따로 부술 수 있다. 실드 발생기가 서 있는 동안 코어는 거의 맞지 않는다. 가까이 가면 부위 체력 표시
//  · 적 포격은 플레이어 근처에 탄착 경고 원을 먼저 띄운다(피할 수 있다). 가까이 붙으면 대공포(근접 신관 파편)와 근접 방어 레이저
//  · 선체에는 충돌 상자가 있어 옆을 스치거나 격납고 통로로 빠져나갈 수 있다
//  · 그리기 비용: 선체는 재질 4개(정점 색)로 합치고, 포탑은 함선마다 InstancedMesh 2개, 불꽃·항해등은 셰이더 하나.
//    탄·포탄·경고 원·사건은 미리 만든 풀을 돌려 쓰고 매 프레임 새 객체를 만들지 않는다
//  · 온라인·PvP·AOS·데스매치에는 나오지 않는다
import * as THREE from "../vendor/three.module.min.js";
import { settings } from "./config.js";
import { makeEscortCraft } from "./ships.js";
import { factionModel } from "./factions.js";
import { fleetMats, turretGeos, TURRET, allyShip, eiaShip, ailShip } from "./fleetmodels.js";

const V3 = THREE.Vector3, PI = Math.PI;
const _v = new V3(), _a = new V3(), _b = new V3(), _d = new V3(), _s = new V3(), _p = new V3(), _w = new V3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _m5 = new THREE.Matrix4(), _c = new THREE.Color();
const UP = new V3(0, 1, 0), XAX = new V3(1, 0, 0), ZAX = new V3(0, 0, 1), ONE = new V3(1, 1, 1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export const SUPPORT_CD = 22;      // 함포 지원 재사용(초)
export const RESUPPLY_R = 70;      // 보급 반경(m)
const MAXSHOT = 220, MAXSHELL = 64, MAXMSL = 40, NWARN = 8;

// ── 대규모 전투인가 ──
export function fleetWanted(mode) {
  const cfg = mode.cfg || {}, c = mode.combat, w = mode.s.world;
  if (settings.fx && settings.fx.fleet === false) return false;
  if (cfg.net || cfg.online || !c || c.ffa) return false;
  if (!mode.s.map.combat || w.size < 150 || (w.ceiling || 999) < 110) return false;
  if (cfg.mode === "challenge") return (cfg.team ?? 0) >= 2 || (cfg.power || 1) >= 1.2 || cfg.mission === "boss" || cfg.mission === "titan";
  if (cfg.mode === "survival") return cfg.variant === "base" || cfg.variant === "conq" || cfg.variant === "fleet" || (cfg.variant === "tdm" && (cfg.bots || 0) >= 8);
  return cfg.mode === "conquest";
}

// ── 이름 · 색 ──
const ALLY_NAMES = ["연합 기함 한빛", "호위함 청룡", "호위함 백호", "호위함 현무"];
const EIA_NAMES = ["에이아 기함 ‘철혈’", "에이아 순양함 ‘붉은 눈’", "에이아 구축함 ‘톱니’", "에이아 구축함 ‘망치’"];
const AIL_NAMES = ["에일 모함 ‘심연의 노래’", "에일 순항체 ‘보랏빛 촉수’", "에일 순항체 ‘가시 포자’", "에일 순항체 ‘물결’"];
const COL = { ally: { tracer: 0x7fd0ff, beam: 0x5ab4ff, msl: 0x9fd8ff, shell: 0xbfe8ff }, eia: { tracer: 0xff6a4a, beam: 0xff3040, msl: 0xffa070, shell: 0xffb070 }, ail: { tracer: 0xd070ff, beam: 0xc060ff, msl: 0xff8ae0, shell: 0xff9af0 } };

// 탄착 경고 구역 (구 하나 = 그리기 1회): 가장자리가 밝은 붉은 구 + 아래에서 차오르는 수위선(탄착까지 남은 시간).
// 안에 들어와 있어도(카메라가 구 안) 둘레가 붉게 보인다
function warnMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(1, 0.3, 0.2) }, uT: { value: 0 } },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float uP; uniform vec3 uC; uniform float uT;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.0);
        float lv = uP * 2.0 - 1.0;
        float fill = (1.0 - smoothstep(lv - 0.02, lv, vP.y)) * 0.1;
        float line = 1.0 - smoothstep(0.0, 0.06, abs(vP.y - lv));
        float grid = smoothstep(0.92, 1.0, sin(atan(vP.z, vP.x) * 8.0 + uT * 1.5) * 0.5 + 0.5) * 0.5 + smoothstep(0.9, 1.0, sin(vP.y * 12.0) * 0.5 + 0.5) * 0.25;
        float blink = 0.7 + 0.3 * sin(uT * (8.0 + uP * 20.0));
        float a = (f * 0.65 + fill + line * 0.7 + grid * f * 0.8 + 0.03) * blink;
        gl_FragColor = vec4(uC * a, a); }`,
  });
}
// 적 기함 실드 막: 가장자리가 밝은 가산 타원체 + 흐르는 띠
function bubbleMat(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uT: { value: 0 }, uHit: { value: 0 }, uOn: { value: 1 }, uC: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uT; uniform float uHit; uniform float uOn; uniform vec3 uC;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.6);
        float band = smoothstep(0.92, 1.0, sin(vP.y * 9.0 - uT * 3.0) * 0.5 + 0.5) * 0.35 + smoothstep(0.95, 1.0, sin((vP.x + vP.z) * 7.0 + uT * 1.7) * 0.5 + 0.5) * 0.2;
        float a = (f * (0.55 + uHit * 1.4) + band * f + uHit * 0.12 + 0.015) * uOn;
        gl_FragColor = vec4(uC * a * 1.4, a); }`,
  });
}

export class Fleet {
  constructor(mode) {
    this.mode = mode; this.s = mode.s; this.c = mode.combat; this.w = this.s.world; this.fx = this.s.fx;
    const q = this.s.game.q || "med", w = this.w, mc = this.s.map.combat, c = this.c;
    this.q = q; this.t = 0;
    this.enemyStyle = this.s.cfg.faction === "ail" ? "ail" : "eia";
    const nShip = q === "low" ? 2 : q === "high" || q === "ultra" ? 4 : 3;
    this.maxF = q === "low" ? 1 : q === "high" || q === "ultra" ? 4 : 3;   // 편마다 함재기
    this.mats = fleetMats();
    this.tgeo = { ally: turretGeos("ally"), [this.enemyStyle]: turretGeos(this.enemyStyle) };
    this.scorchGeo = new THREE.IcosahedronGeometry(1, 0); this.scorchGeo.scale(1, 0.22, 1);
    // 축: 아군 진영 → 적 진영. 두 함대는 축에 수직인 전열(lane)을 따라 서로 옆구리를 보인다
    const blue = new V3(mc.blue[0], 0, mc.blue[1]), red = new V3(mc.red[0], 0, mc.red[1]);
    const axis = red.clone().sub(blue); axis.y = 0; if (axis.lengthSq() < 1) axis.set(1, 0, 0); axis.normalize();
    this.axis = axis; this.mid = blue.clone().add(red).multiplyScalar(0.5); this.lane = new V3(-axis.z, 0, axis.x);
    this.lim = w.size - 40; this.sep = clamp(w.size * 0.75, 130, 230);
    this.front = 0; this.frontT = 0; this.turKills = 0;
    this.ships = []; this.fighters = []; this.beams = []; this.parts = [];
    const variantK = mode.variant === "fleet" ? 5 : 1, power = mode.cfg.power || 1;
    for (const side of [0, 1]) {
      const sg = side ? 1 : -1;
      const C = this.mid.clone().addScaledVector(axis, sg * this.sep / 2);
      C.x = clamp(C.x, -this.lim, this.lim); C.z = clamp(C.z, -this.lim, this.lim);
      const me = c.player;
      if (side && me) {   // 적 함대는 플레이어 코앞이 아니라 중·원거리(260m 이상)에서 시작
        for (let k = 0; k < 12 && Math.hypot(C.x - me.pos.x, C.z - me.pos.z) < 260; k++) {
          C.addScaledVector(axis, 25); C.x = clamp(C.x, -this.lim, this.lim); C.z = clamp(C.z, -this.lim, this.lim);
        }
      }
      for (let i = 0; i < nShip; i++) {
        const big = i === 0, sc = big ? (side ? 1.5 : 1.4) : 0.72, style = side ? this.enemyStyle : "ally";
        const model = (side ? (style === "ail" ? ailShip : eiaShip) : allyShip)(big, this.mats, i + 1 + side * 10);
        model.scale.setScalar(sc);
        w.scene.add(model);
        const ud = model.userData;
        const off = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 82 * (side ? -1 : 1);   // 기함을 가운데 두고 양옆으로
        const sh = { side, big, model, sc, i, style, name: (side ? (style === "ail" ? AIL_NAMES : EIA_NAMES) : ALLY_NAMES)[i] || `함선 ${i + 1}`,
          C, depth: (i % 2 ? 18 : -10) * sg, axis: axis.clone().multiplyScalar(sg), off, ph: side ? PI : 0,
          A: 0, R: (ud.L * sc) / 2, L: ud.L * sc, W: ud.W * sc, H: ud.H * sc, cool: { broad: rnd(1, 3), beam: rnd(3, 6), msl: rnd(4, 9), pd: 0, flak: 2, barr: rnd(5, 9) + i * 2 },
          smokeT: 0, dead: false, deadT: 0, pos: new V3(), vel: new V3(), goal: new V3(), yaw: 0, roll: 0, pitch: 0, fs: 1,
          retreat: false, sag: 0, engK: 1, turK: 1, engDead: 0, inv: new THREE.Matrix4(), tick: 0, lastHp: 0, hintT: 0, hitK: 0, scorchN: 0, burn: [], tgt: null };
        // 항로 진폭: 전열이 맵 안에 들도록
        let A = 64;
        for (; A > 10; A -= 8) { const a = C.clone().addScaledVector(this.lane, off + A), b = C.clone().addScaledVector(this.lane, off - A); if (Math.max(Math.abs(a.x), Math.abs(a.z), Math.abs(b.x), Math.abs(b.z)) < this.lim) break; }
        sh.A = A;
        sh.alt = this._alt(sh) + i * 12 + side * 6;
        sh.floor = sh.alt - this._clear;
        // 전투 액터: 적은 표적(플레이어가 격침 가능), 아군은 표적 아님
        const hp = (big ? 5200 : 2800) * variantK * (side ? 1 : 1.25) * power;
        sh.actor = c.addProp(new THREE.Object3D(), { name: sh.name, team: side, radius: (big ? 10 : 7) * sc, hp, maxHp: hp, static: true, targetable: !!side, flagship: true, armor: side ? 0.5 : 1 });
        sh.actor.ai = { lastHit: null, lastHitT: 0 };
        sh.lastHp = hp;
        sh.hit = new THREE.Group(); model.add(sh.hit);
        // 포탑: 함선마다 InstancedMesh 둘 (몸체 · 포신)
        const T = ud.turrets, tg = this.tgeo[style];
        sh.tb = new THREE.InstancedMesh(tg.body, this.mats.metal, T.length); sh.tr = new THREE.InstancedMesh(tg.barrel, this.mats.matte, T.length);
        for (const m of [sh.tb, sh.tr]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let k = 0; k < T.length; k++) m.setColorAt(k, _c.set(0xffffff)); model.add(m); }
        sh.turrets = T.map((m, k) => ({ ...m, k, yaw: 0, pitch: 0.06, rec: 0, alive: true, part: null, mb: new THREE.Matrix4(), mr: new THREE.Matrix4() }));
        for (const tr of sh.turrets) this._turretMatrix(sh, tr);
        for (const m of [sh.tb, sh.tr]) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); m.boundingSphere.radius += 4; }
        sh.scorch = new THREE.InstancedMesh(this.scorchGeo, this.mats.scorch, 12); sh.scorch.count = 0; sh.scorch.visible = false; model.add(sh.scorch);
        sh.fxMats = [ud.meshes.fx.material];
        if (ud.shieldGenMeshes && ud.shieldGenMeshes.fx) sh.fxMats.push(ud.shieldGenMeshes.fx.material);
        // 약점 부위 (적 기함): 각자 액터·충돌 상자·체력. 충돌 상자를 선체보다 먼저 만들어, 겹치는 곳에서는 부위가 맞는다
        if (side && big && ud.parts) this._makeParts(sh, ud.parts, variantK * power);
        const cols = w.rider(sh.hit, ud.boxes.map((b) => [b[0], b[1], b[2], b[3] * sc, b[4] * sc, b[5] * sc]), side ? "enemy" : "mover");
        for (const cc of cols) cc.owner = sh.actor;
        sh.cols = cols;
        sh.actor.colliders = cols.concat(sh.partCols || []);   // 조준 시야 판정에서 자기 선체는 빼도록
        this.ships.push(sh);
        this._goal(sh); sh.pos.copy(sh.goal); sh.yaw = Math.atan2(-this.lane.x, -this.lane.z) + (side ? PI : 0);
        this._place(sh, 0);
      }
    }
    this.flag = [this.ships.find((x) => x.side === 0 && x.big), this.ships.find((x) => x.side === 1 && x.big)];
    // 적 기함 실드 막
    const ef = this.flag[1];
    if (ef && ef.parts) {
      const geo = new THREE.SphereGeometry(1, 28, 18);
      this.bubble = new THREE.Mesh(geo, bubbleMat(COL[this.enemyStyle].beam)); this.bubble.renderOrder = 5;
      this.bubble.scale.set(ef.model.userData.W * 0.95, ef.model.userData.H * 1.0, ef.model.userData.L * 0.62);
      this.bubble.position.set(0, 1, 0);
      ef.model.add(this.bubble);
    }
    // 빔: 미리 만든 가산 원통 (돌려 쓴다)
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); this.beamGeo.rotateX(PI / 2); this.beamGeo.translate(0, 0, 0.5);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false; m.frustumCulled = false; m.renderOrder = 22; w.scene.add(m);
      this.beams.push({ m, on: false, t: 0, life: 0, from: new V3(), to: new V3(), w: 1, col: new THREE.Color() });
    }
    // 풀: 예광탄 · 포탄 · 미사일 · 탄착 경고 원
    this.shots = []; for (let i = 0; i < MAXSHOT; i++) this.shots.push({ on: false, delay: 0, sh: null, tr: null, tgt: null, color: 0, speed: 0, width: 0, dmg: 0, pos: new V3(), dir: new V3(), life: 0, miss: false, fired: false });
    this.shells = []; for (let i = 0; i < MAXSHELL; i++) this.shells.push({ on: false, delay: 0, t: 0, T: 1, from: new V3(), to: new V3(), h: 0, dmg: 0, R: 0, src: null, tr: null, tgtShip: null, tgt: null, kind: 0, color: 0, prev: new V3() });
    this.msls = []; for (let i = 0; i < MAXMSL; i++) this.msls.push({ on: false, delay: 0, pos: new V3(), vel: new V3(), tgt: null, src: null, life: 0, color: 0, off: new V3(), tr: 0 });
    this.warnGeo = new THREE.SphereGeometry(1, 20, 12);
    this.warns = [];
    for (let i = 0; i < NWARN; i++) { const m = new THREE.Mesh(this.warnGeo, warnMat()); m.visible = false; m.frustumCulled = false; m.renderOrder = 23; w.scene.add(m); this.warns.push({ m, on: false, t: 0, T: 1, r: 10, pos: new V3(), follow: null, me: false }); }
    // 보급: 아군 기함 아래 고리 + 보급 빔
    const al = this.flag[0];
    if (al) {
      const rg = new THREE.RingGeometry(0.965, 1, 64, 1); rg.rotateX(-PI / 2);
      this.ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x5ae0ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      this.ring.renderOrder = 6; this.ring.frustumCulled = false; w.scene.add(this.ring);
      this.rbeam = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0x7fffd0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      this.rbeam.visible = false; this.rbeam.frustumCulled = false; this.rbeam.renderOrder = 22; w.scene.add(this.rbeam);
    }
    this.rs = { in: false, hpAcc: 0, mT: 0, toastT: -99, k: 0 };
    this.supT = 6; this.strike = null; this.supMsgT = -99;
    this.fT = [3, 5];
    this.announced = false;
    this.events = []; for (let i = 0; i < 24; i++) this.events.push({ on: false, t: 0, kind: 0, sh: null, a: null, n: 0 });
    // HUD: 모드의 hud(h) 뒤에 함대 표시를 덧붙인다 (session.render 가 mode.hud 를 부른다)
    if (typeof mode.hud === "function") { const h0 = mode.hud; this._hud0 = h0; mode.hud = (h) => { h0.call(mode, h); this.hud(h); }; }
    // [G]: 함포 지원 요청 (락온·조준 중인 적)
    this._key = (e) => { if (e.code === "KeyG" && !e.repeat && this.s.game.state === "play") { const t = this.c.lock || this.c.aim; this.supportStrike(t, true); } };
    if (typeof window !== "undefined") window.addEventListener("keydown", this._key);
    this._pr = {};
  }

  // 약점 부위 만들기
  _makeParts(sh, defs, k) {
    const c = this.c, w = this.w, sc = sh.sc;
    sh.parts = []; sh.partCols = [];
    for (const d of defs) {
      const hp = d.hp * k;
      const a = c.addProp(new THREE.Object3D(), { name: d.name, team: 1, radius: d.r * sc, hp, maxHp: hp, static: true, targetable: true, flagship: true, flagPart: true, armor: 1 });
      a.ai = { lastHit: null, lastHitT: 0 };
      const p = { ...d, actor: a, local: new V3(...d.c), alive: true, sh, cols: [], smokeT: 0 };
      const boxes = [];
      if (d.box) boxes.push(d.box);
      if (d.group) for (const tr of sh.turrets) if (tr.group === d.group) { tr.part = p; const s = tr.s; boxes.push([tr.p.x, tr.p.y + (tr.under ? -0.9 : 0.9) * s, tr.p.z, 1.3 * s, 0.9 * s, 1.5 * s]); }
      p.hit = new THREE.Group(); sh.model.add(p.hit);   // 부위마다 따로: 부서지면 이 묶음을 숨겨 충돌 상자를 끈다 (world._riders 가 src.visible 을 따른다)
      if (boxes.length) { p.cols = w.rider(p.hit, boxes.map((b) => [b[0], b[1], b[2], b[3] * sc, b[4] * sc, b[5] * sc]), "enemy"); for (const cc of p.cols) cc.owner = a; sh.partCols.push(...p.cols); }
      a.colliders = p.cols;
      sh.parts.push(p); this.parts.push(p);
    }
    sh.partOf = (kind) => sh.parts.filter((p) => p.kind === kind);
    sh.shieldPart = sh.parts.find((p) => p.kind === "shield") || null;
  }

  // 전열 전체(앞뒤 ±110 m)에서 지형·건물에 닿지 않는 고도 (천장 아래)
  _alt(sh) {
    const w = this.w, top = (w.ceiling || 200) - 22;
    let y = 0, gmax = 0;
    for (let s = -sh.A - 40; s <= sh.A + 40; s += 14) for (let d = -110; d <= 110; d += 22) {
      _v.copy(sh.C).addScaledVector(this.lane, sh.off + s).addScaledVector(this.axis, d);
      const h = w.h(clamp(_v.x, -w.size, w.size), clamp(_v.z, -w.size, w.size)); gmax = Math.max(gmax, h);
      y = Math.max(y, h + 38);
    }
    y = Math.max(y, top * 0.55);
    for (let n = 0; n < 30 && y < top; n++) {
      let ok = true;
      for (let s = -sh.A - 30; s <= sh.A + 30 && ok; s += 15) for (let d = -100; d <= 100 && ok; d += 25) { _v.copy(sh.C).addScaledVector(this.lane, sh.off + s).addScaledVector(this.axis, d); _v.y = y; if (w.col.blocked(_v, sh.R * 0.6)) ok = false; }
      if (ok) break;
      y += 6;
    }
    y = Math.min(y, top - 10);
    this._clear = Math.max(0, Math.min(18, y - gmax - 26));   // 엔진이 부서지면 내려갈 수 있는 높이
    return y;
  }

  // 전열 위치: 전선 값에 따라 두 줄이 함께 밀린다. 적 포대를 부수면 아군이 더 나아간다
  _line(side, out) {
    const adv = this.sep * 0.28;
    let a0 = -this.sep / 2 + this.front * adv + Math.min(3, this.turKills) * 10, a1 = this.sep / 2 + this.front * adv * 0.7;
    if (a1 - a0 < 95) { const m = (a0 + a1) / 2; a0 = m - 47.5; a1 = m + 47.5; }
    return out.copy(this.mid).addScaledVector(this.axis, side ? a1 : a0);
  }
  _goal(sh) {
    const g = sh.goal;
    this._line(sh.side, g);
    const u = this.t * (5 / Math.max(20, sh.A)) + sh.ph;
    g.addScaledVector(this.lane, sh.off + Math.sin(u) * sh.A).addScaledVector(this.axis, sh.depth + Math.cos(u) * 10 * (sh.side ? 1 : -1));
    if (sh.retreat) g.addScaledVector(sh.axis, 70);
    g.x = clamp(g.x, -this.lim, this.lim); g.z = clamp(g.z, -this.lim, this.lim);
    g.y = sh.alt - sh.sag + (sh.retreat ? 8 : 0) + Math.sin(this.t * 0.35 + sh.i) * 1.6;
  }

  // 이동: 목표 지점을 향해 가속(엔진 상태만큼), 뱃머리는 전열 방향(현측을 적에게) — 크게 움직일 때는 진행 방향으로
  _place(sh, dt) {
    if (dt > 0) {
      this._goal(sh);
      _a.copy(sh.goal).sub(sh.pos);
      const d = _a.length(), vmax = (sh.big ? 6.5 : 7.5) * sh.engK * (sh.retreat ? 1.3 : 1);
      _a.multiplyScalar(vmax / Math.max(d, 22));
      _a.y = clamp((sh.goal.y - sh.pos.y) * 0.4, -3, 3);
      sh.vel.lerp(_a, Math.min(1, dt * 0.5));
      sh.pos.addScaledVector(sh.vel, dt);
      const vl = sh.vel.dot(this.lane), va = sh.vel.dot(this.axis);
      if (Math.abs(vl) > 1.2) sh.fs = vl > 0 ? 1 : -1;
      _b.copy(this.lane).multiplyScalar(sh.fs * Math.max(2.5, Math.abs(vl))).addScaledVector(this.axis, Math.abs(va) > 2.5 ? va * 0.8 : 0);
      const want = Math.atan2(-_b.x, -_b.z);
      const dy = wrap(want - sh.yaw), rate = 0.2 * (0.4 + 0.6 * sh.engK);
      sh.yaw += clamp(dy, -rate * dt, rate * dt);
      const list = sh.parts ? (this._engDead(sh, 0) - this._engDead(sh, 1)) * 0.09 : 0;
      sh.roll += (clamp(-dy * 0.8, -0.12, 0.12) + list - sh.roll) * Math.min(1, dt * 0.8);
      sh.pitch += ((sh.sag > 0 && sh.engK < 1 ? -0.04 * (1 - sh.engK) : 0) - sh.pitch) * Math.min(1, dt * 0.5);
    }
    sh.model.position.copy(sh.pos);
    sh.model.rotation.set(sh.pitch, sh.yaw, sh.roll, "YXZ");
    sh.model.updateMatrixWorld(true);
    sh.inv.copy(sh.model.matrixWorld).invert();
    sh.actor.pos.copy(sh.pos); sh.actor.vel.copy(sh.vel);
    if (sh.parts) for (const p of sh.parts) { p.actor.pos.copy(p.local).applyMatrix4(sh.model.matrixWorld); p.actor.vel.copy(sh.vel); }
  }
  _engDead(sh, pod) { for (const p of sh.parts) if (p.kind === "engine" && p.pod === pod) return p.alive ? 0 : 1; return 0; }

  // 선체 위의 임의의 점 (월드)
  _hullPoint(sh, out) {
    out.set(rnd(-0.4, 0.4) * sh.W, rnd(-0.3, 0.3) * sh.H, rnd(-0.42, 0.42) * sh.L).applyEuler(sh.model.rotation).add(sh.pos);
    return out;
  }

  // ── 포탑 ──
  _turretMatrix(sh, tr) {
    _q.setFromAxisAngle(UP, tr.rest + tr.yaw);
    if (tr.under) _q.multiply(_q2.setFromAxisAngle(ZAX, PI));
    tr.mb.compose(tr.p, _q, _s.setScalar(tr.s));
    _m4.makeTranslation(TURRET.pivot.x, TURRET.pivot.y, TURRET.pivot.z);
    _m5.makeRotationX(tr.pitch); _m4.multiply(_m5);
    _m5.makeTranslation(0, 0, tr.rec * 0.7); _m4.multiply(_m5);
    tr.mr.multiplyMatrices(tr.mb, _m4);
    sh.tb.setMatrixAt(tr.k, tr.mb); sh.tr.setMatrixAt(tr.k, tr.mr);
  }
  // 포탑이 월드 점 p 를 겨눈다 (회전 속도 제한)
  _aim(tr, sh, p, dt) {
    _v.copy(p).applyMatrix4(sh.inv).sub(tr.p);
    let y = wrap(Math.atan2(-_v.x, -_v.z) - tr.rest);
    const lim = tr.side ? 1.45 : 2.7; y = clamp(y, -lim, lim);
    const pt = clamp(Math.atan2(tr.under ? -_v.y : _v.y, Math.hypot(_v.x, _v.z)), -0.15, 0.7);
    tr.yaw += clamp(wrap(y - tr.yaw), -1.3 * dt, 1.3 * dt);
    tr.pitch += clamp(pt - tr.pitch, -0.9 * dt, 0.9 * dt);
    return Math.abs(wrap(y - tr.yaw)) < 0.35;
  }
  _muzzle(sh, tr, out) { return out.set(0, 0, -TURRET.muzzle).applyMatrix4(tr.mr).applyMatrix4(sh.model.matrixWorld); }
  // 가장 가까운 살아 있는 포탑 (sideTo: -1/1 은 그 현측 + 갑판, 0 은 아무거나)
  _nearestTurret(sh, p) {
    let best = null, bd = 1e18;
    for (const tr of sh.turrets) { if (!tr.alive) continue; _v.copy(tr.p).applyMatrix4(sh.model.matrixWorld); const d = _v.distanceToSquared(p); if (d < bd) { bd = d; best = tr; } }
    return best;
  }

  _pickTarget(sh) {
    let best = null, bd = 1e9;
    for (const o of this.ships) {
      if (o.side === sh.side || o.dead) continue;
      const d = o.pos.distanceTo(sh.pos) * (0.8 + Math.random() * 0.5);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  update(dt, live) {
    this.t += dt;
    const fx = this.fx, me = this.mode.me, cam = this.s.camera;
    for (const sh of this.ships) {
      if (sh.dead) { this._dying(sh, dt); continue; }
      this._place(sh, dt);
      const hpK = sh.actor.hp / sh.actor.maxHp;
      for (const m of sh.fxMats) { m.uniforms.uT.value = this.t; m.uniforms.uPw.value = 0.55 + 0.45 * sh.engK + (sh.retreat ? 0.25 : 0); }
      for (const p of sh.search || (sh.search = sh.model.userData.search)) p.rotation.set(0.55 + Math.sin(this.t * 0.35 + p.position.x) * 0.35, 0, Math.sin(this.t * 0.27 + p.position.x * 0.7) * 0.5);
      if (!sh.actor.alive) { this._sink(sh); continue; }
      if (sh.parts) this._partsTick(sh, dt, me);
      // 크게 상하면 물러난다
      if (!sh.retreat && hpK < 0.3) {
        sh.retreat = true;
        if (sh.side) this.s.hud.feed(`${sh.name} 후퇴 중 — 추격하라`, "#ffd24a");
        else { this.s.hud.feed(`${sh.name} 손상 심각 — 후퇴`, "#ff9a6a"); this._radio(sh.name, "선체 손상 심각, 전열에서 물러난다! 엄호 바란다!"); }
      }
      // 손상: 연기 꼬리 · 불길 · 그을음 · 불똥
      if (hpK < 0.7 && (sh.smokeT -= dt) <= 0) {
        sh.smokeT = hpK < 0.3 ? 0.08 : 0.16;
        const pts = sh.dmgPts || (sh.dmgPts = [0, 1, 2].map(() => new V3(rnd(-0.3, 0.3) * sh.model.userData.W, rnd(0.1, 0.32) * sh.model.userData.H, rnd(-0.35, 0.35) * sh.model.userData.L)));
        const n = hpK < 0.3 ? 3 : hpK < 0.5 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          _a.copy(pts[k]).applyMatrix4(sh.model.matrixWorld);
          fx.smoke(_a, 2.6 * sh.sc, 3.2, 0.09, 1.4);
          if (hpK < 0.45) fx.burst(_a, 0xff7a2a, 3, 3, 0.6, 1.4 * sh.sc, -2);
          if (sh.scorchN <= k) this._scorch(sh, pts[k], 2.2 + k * 0.6);
        }
        if (hpK < 0.5 && Math.random() < 0.25) fx.spark(this._hullPoint(sh, _a), 0xffd27a, 6);
        if (hpK < 0.3 && Math.random() < 0.06) fx.explosion(this._hullPoint(sh, _a), 1.1);
      }
      // 부서진 부위: 불길과 연기, 가끔 불똥
      for (const b of sh.burn) {
        if ((b.t -= dt) > 0) continue;
        b.t = 0.12;
        _a.copy(b.p).applyMatrix4(sh.model.matrixWorld);
        fx.smoke(_a, 2.2 * sh.sc, 3, 0.07, 1.2); fx.burst(_a, 0xff8a3a, 2, 3, 0.5, 1.2 * sh.sc, -3);
        if (Math.random() < 0.12) fx.spark(_a, 0xffe08a, 7);
      }
      // 포탑: 가까운 함선은 매 프레임, 먼 함선은 가끔 갱신
      const near = cam.position.distanceToSquared(sh.pos) < 520 * 520;
      if (near || (sh.tick = (sh.tick + 1) % 6) === 0) this._turrets(sh, near ? dt : dt * 6, me);
      if (!live) continue;
      this._fire(sh, dt, me);
    }
    if (live) {
      this._front(dt);
      this._fighters(dt); this._missiles(dt);
      this._resupply(dt, me);
      this._autoSupport(dt);
    }
    this._shots(dt, live); this._shells(dt, live); this._events(dt);
    this._beams(dt); this._warnTick(dt, cam);
    this._bubbleTick(dt);
    if (live) this._drawShots();
    if (this.supT > 0 && live) this.supT -= dt;
    if (live && !this.announced && this.t > 2.5) {
      this.announced = true;
      this.s.hud.feed(`아군 함대 ${this.alive(0)}척 전개 — 적 기함 접근`, "#9fd8ff");
      if (this.flag[0]) this.s.hud.feed(`${this.flag[0].name} 근처에서 보급 · 락온 유지/[G] 함포 지원`, "#7fe6ff");
    }
  }

  // 포탑 조준: 가까운 플레이어(적 함선) → 아니면 상대 함선
  _turrets(sh, dt, me) {
    const meNear = sh.side && me && me.alive && me.pos.distanceToSquared(sh.pos) < 170 * 170;
    const tgt = sh.tgt && !sh.tgt.dead ? sh.tgt : null;
    for (const tr of sh.turrets) {
      if (tr.alive) {
        if (meNear && (tr.side === 0 || Math.sign(_v.copy(me.pos).applyMatrix4(sh.inv).x) === tr.side)) this._aim(tr, sh, me.pos, dt);
        else if (tgt) this._aim(tr, sh, tgt.pos, dt);
        else { tr.yaw += clamp(-tr.yaw, -dt, dt); }
        tr.rec = Math.max(0, tr.rec - dt * 2.2);
      }
      this._turretMatrix(sh, tr);
    }
    sh.tb.instanceMatrix.needsUpdate = true; sh.tr.instanceMatrix.needsUpdate = true;
  }

  _fire(sh, dt, me) {
    const c = sh.cool, col = COL[sh.style];
    for (const k in c) c[k] -= dt;
    const slow = sh.retreat ? 1.6 : 1, tk = Math.max(0.15, sh.turK);
    const tgt = sh.tgt && !sh.tgt.dead && Math.random() > dt * 0.1 ? sh.tgt : (sh.tgt = this._pickTarget(sh));
    if (tgt) {
      _d.copy(tgt.pos).sub(sh.pos); const dist = _d.length(); _d.normalize();
      // 현측 포열: 목표 쪽 옆구리의 포가 연달아 쏜다 (부서진 포대는 빠진다)
      if (!(c.broad > 0)) {
        c.broad = rnd(2.4, 3.6) * (sh.big ? 1 : 1.3) * slow;
        const rx = Math.cos(sh.yaw), rz = -Math.sin(sh.yaw), sideTo = rx * _d.x + rz * _d.z > 0 ? 1 : -1;
        let gi = 0;
        for (const tr of sh.turrets) {
          if (!tr.alive || (tr.side !== sideTo && tr.side !== 0)) continue;
          for (let r = 0; r < 2; r++) this._queueShot(sh, tr, tgt, gi * 0.13 + r * 0.11, col.tracer, sh.style === "ail" ? 70 : 170, sh.style === "ail" ? 1.6 : 0.55, 5);
          gi++;
        }
      }
      // 주포 빔 (기함)
      if (sh.big && !(c.beam > 0) && dist < 440) {
        c.beam = rnd(5.5, 8) * slow / Math.min(1, tk + 0.3);
        const tr = sh.turrets[0];
        if (tr.alive) {
          const from = this._muzzle(sh, tr, _a), to = this._hullPoint(tgt, _b);
          this._beam(from, to, col.beam, sh.style === "ail" ? 1.4 : 1.0, 0.55);
          this.fx.muzzle(from, _w.copy(to).sub(from).normalize(), col.beam, 4); this.fx.flash(from, col.beam, 4, 0.15);
          this.fx.explosion(to, 1.6); this._hurt(tgt, 110, sh, to);
          tr.rec = 1;
          this._snd("elaser", sh.pos, 0.9, 0.5);
        }
      }
      // 미사일 일제 사격
      if (!(c.msl > 0)) {
        c.msl = rnd(9, 13) * (sh.big ? 1 : 1.4) * slow;
        const n = sh.big ? 6 : 3;
        for (let k = 0; k < n; k++) this._missile(sh, tgt, col.msl, k * 0.18);
      }
    }
    // 함포 탄막 (포물선 포탄): 적은 가까운 플레이어 쪽에도 쏜다 — 탄착 원으로 먼저 알린다
    if (!(c.barr > 0)) {
      c.barr = rnd(9, 13) * (sh.big ? 1 : 1.6) * slow / tk;
      const meOk = sh.side && me && me.alive && this.s.time > (me.spawnGodT || 0) && me.pos.distanceTo(sh.pos) < 280;
      if (meOk && Math.random() < 0.6) this._barrage(sh, null, me);
      else if (tgt) this._barrage(sh, tgt, null);
    }
    // 근접 방어: 적 함선은 가까이 온 플레이어에게 레이저 + 대공 파편탄
    if (sh.side && me && me.alive) {
      const d = me.pos.distanceTo(sh.pos);
      if (!(c.pd > 0)) {
        if (d < 130) {
          c.pd = rnd(0.9, 1.4) / Math.max(0.35, tk);
          const tr = this._nearestTurret(sh, me.pos);
          if (tr) {
            const from = this._muzzle(sh, tr, new V3()), dir = new V3();
            this.c._lead(from, me, 110, dir).sub(from).normalize();
            dir.x += rnd(-0.04, 0.04); dir.y += rnd(-0.04, 0.04); dir.z += rnd(-0.04, 0.04); dir.normalize();
            this.c.fireLaser(sh.actor, from, dir, 4, COL[sh.style].tracer, 110);
            this.fx.muzzle(from, dir, COL[sh.style].tracer, 2.4); tr.rec = 0.6;
          }
        } else c.pd = 0.5;
      }
      if (!(c.flak > 0)) {
        if (d < 160) {
          c.flak = rnd(1.1, 1.7) / Math.max(0.3, tk);
          const tr = this._nearestTurret(sh, me.pos);
          if (tr) {
            const sl = this._shell(); if (sl) {
              this._muzzle(sh, tr, sl.from);
              sl.to.copy(me.pos).addScaledVector(me.vel, 0.45 + d / 260).add(_a.set(rnd(-1, 1), rnd(-0.6, 1), rnd(-1, 1)).multiplyScalar(rnd(3, 7)));
              Object.assign(sl, { delay: 0, t: 0, T: Math.max(0.25, sl.from.distanceTo(sl.to) / 240), h: 0, dmg: 10, R: 7, src: sh, tr, tgtShip: null, tgt: null, kind: 2, color: 0xffd08a });
              sl.prev.copy(sl.from);
              this.fx.muzzle(sl.from, _w.copy(sl.to).sub(sl.from).normalize(), 0xffc070, 2.4); tr.rec = 1;
              if (Math.random() < 0.5) this._snd("laser", sl.from, 0.5, 0.45);
            }
          }
        } else c.flak = 0.6;
      }
    }
  }

  // 함대끼리의 피해: 적 장갑은 플레이어 탄에만 적용되도록 되돌려 준다. 0.6 배 → 함대 포격만으로는 기함이 3~5분 버틴다. 적 기함 실드는 함포도 반쯤 막는다
  _hurt(t, dmg, src, pt) {
    if (!t || t.dead || !t.actor.alive) return;
    const sk = t.shieldPart && t.shieldPart.alive ? 0.5 : 1;
    this.c.damage(t.actor, dmg * 0.6 * sk / (t.actor.armor || 1), src ? src.actor : null, pt);
  }
  _blast(pos, k) { const d = this.s.camera.position.distanceTo(pos), e = k * clamp(1 - d / 260, 0, 1); if (e > 0.05 && this.s.feel && this.s.feel.emit) this.s.feel.emit("blast", e, pos); }   // 먼 폭발은 화면을 흔들지 않는다
  _snd(name, pos, vol = 1, rate = 1) { const c = this.c; if (c.snd && c.volAt) c.snd.play(name, c.volAt(pos) * vol, c.panAt(pos), rate); }
  _radio(who, line, prio = 3) { const s = this.mode.s; if (s.radioSay) s.radioSay(who, line, { prio, ttl: 7, force: prio >= 3 }); }
  _scorch(sh, local, r) {
    if (sh.scorchN >= 12) return;
    _q.setFromEuler(new THREE.Euler(rnd(-0.3, 0.3), rnd(0, 6.28), rnd(-0.3, 0.3)));
    _m4.compose(local, _q, _s.set(r, r, r * rnd(0.8, 1.3)));
    sh.scorch.setMatrixAt(sh.scorchN++, _m4); sh.scorch.count = sh.scorchN; sh.scorch.visible = true; sh.scorch.instanceMatrix.needsUpdate = true;
  }

  // ── 예광탄 (풀) ──
  _queueShot(sh, tr, tgt, delay, color, speed, width, dmg) {
    let s = null; for (const x of this.shots) if (!x.on) { s = x; break; }
    if (!s) return;
    s.on = true; s.fired = false; s.delay = delay; s.sh = sh; s.tr = tr; s.tgt = tgt; s.color = color; s.speed = speed; s.width = width; s.dmg = dmg;
  }
  _shots(dt, live) {
    const fx = this.fx;
    for (const s of this.shots) {
      if (!s.on) continue;
      if (!s.fired) {
        if (!live) continue;
        if ((s.delay -= dt) > 0) continue;
        const sh = s.sh, tgt = s.tgt;
        if (sh.dead || !tgt || tgt.dead || !s.tr.alive) { s.on = false; continue; }
        this._muzzle(sh, s.tr, s.pos);
        s.miss = Math.random() < 0.3;
        this._hullPoint(tgt, _a);
        _a.addScaledVector(tgt.vel, s.pos.distanceTo(_a) / s.speed);
        if (s.miss) _a.add(_b.set(rnd(-1, 1), rnd(-0.6, 1), rnd(-1, 1)).multiplyScalar(14));
        s.dir.copy(_a).sub(s.pos); s.life = s.dir.length() / s.speed; s.dir.normalize();
        s.fired = true; s.tr.rec = 1;
        fx.muzzle(s.pos, s.dir, s.color, 3);
        if (Math.random() < 0.35) fx.flash(s.pos, s.color, 2.2, 0.07);
        if (Math.random() < 0.25) this._snd("laser", s.pos, 0.35, 0.6);
        continue;
      }
      s.pos.addScaledVector(s.dir, s.speed * Math.min(s.life, dt)); s.life -= dt;
      if (s.life > 0) continue;
      s.on = false;
      if (s.miss || !s.tgt || s.tgt.dead) { fx.burst(s.pos, 0xffc070, 6, 5, 0.4, 0.8, 0); fx.smoke(s.pos, 1.4, 1.4, 0.2, 1); continue; }   // 대공 작렬
      fx.explosion(s.pos, 0.55);
      this._hurt(s.tgt, s.dmg, s.sh, s.pos);
    }
  }
  _drawShots() {
    const fx = this.fx;
    for (const s of this.shots) if (s.on && s.fired) fx.bolt(s.pos, s.dir, s.width > 1 ? 3 : 7, s.color, s.width);
    for (const m of this.msls) if (m.on && m.delay <= 0) fx.bolt(m.pos, _a.copy(m.vel).normalize(), 2.2, 0xdde3ec, 0.5);
    for (const sl of this.shells) if (sl.on && sl.delay <= 0) { _a.copy(sl.prev); this._shellPos(sl, sl.t, _b); _d.copy(_b).sub(_a); const l = _d.length(); if (l > 1e-4) fx.bolt(_b, _d.multiplyScalar(1 / l), sl.kind === 2 ? 3 : 6, sl.color, sl.kind === 2 ? 0.35 : 0.8); }
    for (const f of this.fighters) for (const b of f.bolts) fx.bolt(b.p, b.d, 3.5, b.c, 0.22);
    fx.endBolts();
  }

  // ── 포탄 (풀): kind 0 함대 탄막 · 1 아군 함포 지원 · 2 대공 파편탄 ──
  _shell() { for (const x of this.shells) if (!x.on) { x.on = true; return x; } return null; }
  _shellPos(sl, t, out) { const u = clamp(t / sl.T, 0, 1); return out.lerpVectors(sl.from, sl.to, u).addScaledVector(UP, sl.h * 4 * u * (1 - u)); }
  // 탄막: 표적 함선(선체 여러 곳) 또는 플레이어(탄착 경고 원)
  _barrage(sh, tgtShip, me) {
    const col = COL[sh.style];
    const guns = sh.turrets.filter((t) => t.alive); if (!guns.length) return;
    const n = Math.round((sh.big ? 5 : 3) * (0.5 + 0.5 * sh.turK));
    const tele = me ? 2.4 : rnd(1.6, 2.2);
    let center = null, wr = null;
    if (me) {
      center = _p.copy(me.pos).addScaledVector(me.vel, tele * 0.55);   // 반쯤만 앞질러 겨눈다 → 움직이면 피할 수 있다
      center.y = Math.max(center.y, this.w.h(center.x, center.z) + 2);
      wr = this._warn(center, 13, tele, null, true, col.beam);
      if (!this._barrTold) { this._barrTold = true; this.s.hud.toast("⚠ 적 함포 탄막 — 경고 원을 벗어나라", "#ff8a6a", 1.6, 20); }
    } else if (this.mode.me && tgtShip.pos.distanceTo(this.mode.me.pos) < 120) {
      this._warn(tgtShip.pos, tgtShip.R * 0.9, tele, null, false, col.beam);   // 내 근처의 아군 함선에 떨어질 탄막
    }
    for (let k = 0; k < n; k++) {
      const sl = this._shell(); if (!sl) break;
      const tr = guns[k % guns.length];
      sl.delay = 0.01 + k * 0.14; sl.t = 0; sl.src = sh; sl.tr = tr; sl.kind = 0; sl.color = col.shell; sl.tgt = null;
      this._muzzle(sh, tr, sl.from); sl.prev.copy(sl.from);
      if (me) { sl.to.copy(center).add(_a.set(rnd(-1, 1), rnd(-0.5, 0.5), rnd(-1, 1)).multiplyScalar(7)); sl.tgtShip = null; sl.dmg = 24; sl.R = 8; }
      else { this._hullPoint(tgtShip, sl.to); sl.to.addScaledVector(tgtShip.vel, tele); sl.tgtShip = tgtShip; sl.dmg = 30; sl.R = 6; }
      sl.T = tele - sl.delay; sl.h = clamp(sl.from.distanceTo(sl.to) * 0.18, 10, 45);
    }
    this._snd("missile", sh.pos, 0.8, 0.5);
  }
  _shells(dt, live) {
    const fx = this.fx, c = this.c, me = this.mode.me;
    for (const sl of this.shells) {
      if (!sl.on) continue;
      if (sl.delay > 0) {
        if (!live) continue;
        if ((sl.delay -= dt) > 0) continue;
        if (sl.src.dead || (sl.tr && !sl.tr.alive)) { sl.on = false; continue; }
        if (sl.tr) { this._muzzle(sl.src, sl.tr, sl.from); sl.tr.rec = 1; }
        sl.prev.copy(sl.from);
        fx.muzzle(sl.from, _a.copy(sl.to).sub(sl.from).normalize(), sl.color, 4.5); fx.flash(sl.from, sl.color, 4, 0.12); fx.smoke(sl.from, 2, 1.6, 0.4, 0.8);
        continue;
      }
      if (!live) continue;
      this._shellPos(sl, sl.t, sl.prev);
      sl.t += dt;
      if (sl.kind !== 2 && ((sl.tr2 = (sl.tr2 || 0) + 1) & 1)) { this._shellPos(sl, sl.t, _a); fx.puff(_a, sl.color, 0.9, 0.35, 0.1); fx.smoke(_a, 0.7, 1.1, 0.5, 0.2); }
      if (sl.t < sl.T) continue;
      sl.on = false;
      const p = sl.to;
      if (sl.kind === 2) {   // 대공 파편탄: 검은 연기 꽃 + 반경 피해
        fx.burst(p, 0xffb050, 14, 12, 0.35, 0.5, 0); fx.smoke(p, 2.6, 1.8, 0.12, 1.2); fx.flash(p, 0xffa040, 4, 0.1);
        if (sl.src && !sl.src.dead) c.splash(p, sl.R, sl.dmg, sl.src.actor, null);
        if (me && p.distanceTo(me.pos) < 24) this._snd("explode", p, 0.5, 1.6);
        continue;
      }
      fx.explosion(p, sl.kind === 1 ? 1.7 : 1.3); fx.ring(p, sl.kind === 1 ? 0x9fe8ff : 0xffc070, sl.R * 1.6, 0.4); fx.debrisBurst(p, 0x6a6058, 5, 12, 0.35); fx.smoke(p, 3, 2.4, 0.15, 1.5);
      this._blast(p, 0.45);
      if (Math.random() < 0.6) this._snd("explode", p, 0.8, 0.8);
      if (sl.kind === 1) { this._strikeHit(sl, p); continue; }
      if (sl.tgtShip) this._hurt(sl.tgtShip, sl.dmg, sl.src, p);
      if (sl.src && !sl.src.dead) c.splash(p, sl.R, sl.dmg, sl.src.actor, null);
    }
  }

  // ── 탄착 경고 원 ──
  _warn(pos, r, T, follow, me, color) {
    let w = null; for (const x of this.warns) if (!x.on) { w = x; break; }
    if (!w) return null;
    w.on = true; w.t = 0; w.T = T; w.r = r; w.lock = 0; w.pos.copy(pos); w.follow = follow; w.me = me;
    w.m.material.uniforms.uC.value.set(color).multiplyScalar(1.4); w.m.visible = true;
    return w;
  }
  _warnTick(dt, cam) {
    for (const w of this.warns) {
      if (!w.on) continue;
      w.t += dt;
      if (w.t >= w.T) { w.on = false; w.m.visible = false; w.follow = null; continue; }
      if (w.follow && w.follow.alive && w.t < w.lock) w.pos.copy(w.follow.pos);
      const k = w.t / w.T, pop = Math.min(1, w.t * 5);
      w.m.position.copy(w.pos);
      w.m.scale.setScalar(w.r * (0.6 + 0.4 * pop));
      const u = w.m.material.uniforms; u.uP.value = k; u.uT.value = this.t;
    }
  }

  // ── 미사일 (장식 + 함선 피해, 풀) ──
  _missile(sh, tgt, color, delay) {
    let m = null; for (const x of this.msls) if (!x.on) { m = x; break; }
    if (!m) return;
    m.on = true; m.delay = delay; m.src = sh; m.tgt = tgt; m.color = color; m.life = 9; m.tr = 0;
    m.off.set(rnd(-0.3, 0.3), rnd(-0.2, 0.2), rnd(-0.35, 0.35));
  }
  _missiles(dt) {
    const fx = this.fx;
    for (const m of this.msls) {
      if (!m.on) continue;
      if (m.delay > 0) {
        if ((m.delay -= dt) > 0) continue;
        if (m.src.dead || !m.tgt || m.tgt.dead) { m.on = false; continue; }
        this._hullPoint(m.src, m.pos); m.pos.y += m.src.H * 0.4;
        m.vel.set(rnd(-0.5, 0.5), 1, rnd(-0.5, 0.5)).normalize().multiplyScalar(18);
        fx.flash(m.pos, m.color, 2.5, 0.12);
        if (Math.random() < 0.5) this._snd("missile", m.pos, 0.5, 0.8);
        continue;
      }
      m.life -= dt;
      const t = m.tgt;
      if (t && !t.dead) {
        _a.copy(m.off).multiply(_b.set(t.model.userData.W, t.model.userData.H, t.model.userData.L)).applyMatrix4(t.model.matrixWorld);
        _b.copy(_a).sub(m.pos); const d = _b.length();
        if (d < 3) { m.on = false; fx.explosion(m.pos, 1.3); this._hurt(t, 28, m.src, m.pos); continue; }
        _b.normalize().multiplyScalar(55);
        m.vel.lerp(_b, Math.min(1, dt * 1.6));
      }
      m.pos.addScaledVector(m.vel, dt);
      if ((m.tr = m.tr + 1) % 2 === 0) { fx.puff(m.pos, m.color, 0.7, 0.6, 0.3); fx.smoke(m.pos, 0.9, 1.6, 0.55, 0.3); }
      if (m.life <= 0 || m.pos.y < this.w.h(m.pos.x, m.pos.z)) { m.on = false; fx.explosion(m.pos, 0.8); }
    }
  }

  _beam(from, to, color, width, life) {
    let b = this.beams[0]; for (const x of this.beams) if (!x.on) { b = x; break; }
    b.on = true; b.t = 0; b.life = life; b.from.copy(from); b.to.copy(to); b.w = width; b.col.set(color);
    b.m.material.color.copy(b.col); b.m.visible = true;
  }
  _beams(dt) {
    for (const b of this.beams) {
      if (!b.on) continue;
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1) { b.on = false; b.m.visible = false; continue; }
      const len = b.from.distanceTo(b.to);
      b.m.position.copy(b.from); b.m.lookAt(b.to);
      const wv = b.w * (1 - k * 0.6) * (1 + Math.sin(b.t * 70) * 0.12);
      b.m.scale.set(wv, wv, len);
      b.m.material.opacity = 0.75 * (1 - k);
      if (Math.random() < dt * 30) this.fx.burst(b.to, b.col.getHex(), 3, 6, 0.3, 0.9, 0);
    }
  }
  // 지연 사건 풀 (클로저 없이)
  _event(kind, t, sh, a, n = 0) { for (const e of this.events) if (!e.on) { e.on = true; e.kind = kind; e.t = t; e.sh = sh; e.a = a; e.n = n; return e; } return null; }
  _events(dt) {
    for (const e of this.events) {
      if (!e.on || (e.t -= dt) > 0) continue;
      e.on = false;
      if (e.kind === 1) this._strikeFire();
    }
  }

  // ── 전선 ──
  strength(side) {
    let s = 0;
    for (const sh of this.ships) if (sh.side === side && !sh.dead) s += (sh.big ? 2 : 1) * (0.3 + 0.7 * sh.actor.hp / sh.actor.maxHp) * (sh.parts ? 0.55 + 0.45 * sh.turK : 1);
    return s;
  }
  _front(dt) {
    if ((this.frontT -= dt) > 0) return;
    this.frontT = 0.5;
    const a = this.strength(0), b = this.strength(1);
    const tgt = clamp((a - b) / (a + b + 1e-3) * 1.5 + this.turKills * 0.1, -1, 1);
    const prev = this.front;
    this.front += clamp(tgt - this.front, -0.012, 0.012);
    if (prev < 0.35 && this.front >= 0.35) this.s.hud.feed("아군 함대 전진 — 전선이 적 쪽으로 밀린다", "#8cc4ff");
    if (prev > -0.35 && this.front <= -0.35) this.s.hud.feed("적 함대가 밀고 들어온다 — 전선 후퇴", "#ff8a94");
  }

  // ── 적 기함 약점 ──
  _partsTick(sh, dt, me) {
    const fx = this.fx;
    let tAlive = 0, tAll = 0;
    for (const p of sh.parts) {
      if (p.kind === "turret") { tAll++; if (p.alive) tAlive++; }
      if (p.alive && !p.actor.alive) this._partDown(sh, p, me);
    }
    sh.turK = tAll ? tAlive / tAll : 1;
    // 엔진: 하나 잃으면 느려지고 처지며 기운다. 둘 다 잃으면 거의 표류
    const ed = this._engDead(sh, 0) + this._engDead(sh, 1);
    sh.engK = ed === 0 ? 1 : ed === 1 ? 0.55 : 0.18;
    const sagT = ed * 0.5 * this._clear;
    sh.sag += clamp(sagT - sh.sag, -dt * 1.5, dt * 1.2);
    // 코어 장갑: 실드가 서 있으면 거의 막고, 정면(뱃머리 쪽)에서 쏘면 더 막는다
    const shieldUp = sh.shieldPart && sh.shieldPart.alive;
    let arm = shieldUp ? 0.1 : 0.9;
    if (me && me.alive) {
      _a.copy(me.pos).sub(sh.pos); const d = _a.length();
      const fw = (-Math.sin(sh.yaw) * _a.x - Math.cos(sh.yaw) * _a.z) / Math.max(d, 1);
      if (fw > 0.6) arm *= 0.3;
    }
    sh.actor.armor = arm;
    // 실드에 막힌 사격: 막이 번쩍 + 가끔 안내
    if (sh.actor.hp < sh.lastHp - 0.01) {
      if (shieldUp) { sh.hitK = 1; if (sh.actor.ai.lastHit === me && this.t > sh.hintT) { sh.hintT = this.t + 14; this.s.hud.toast("실드에 막힘 — 실드 발생기부터 부숴라", "#ffd24a", 1.8, 20); } }
      else if (arm < 0.5 && sh.actor.ai.lastHit === me && this.t > sh.hintT) { sh.hintT = this.t + 14; this.s.hud.toast("정면 장갑 — 옆이나 뒤로 돌아가라", "#ffd24a", 1.6, 20); }
    }
    sh.lastHp = sh.actor.hp;
    void fx;
  }
  _partDown(sh, p, me) {
    p.alive = false;
    p.hit.visible = false;
    const fx = this.fx, hud = this.s.hud, pos = p.actor.pos;
    fx.destroy(pos, 1.8 * sh.sc); fx.debrisBurst(pos, 0x3a3f4a, 14, 16, 0.6); fx.ring(pos, 0xffd27a, 14, 0.5);
    this._snd("explode", pos, 1.2, 0.8); this._blast(pos, 0.5);
    const mine = me && p.actor.ai.lastHit === me;
    if (mine) me.score += 400;
    p.burn = { p: p.local.clone(), t: 0 }; sh.burn.push(p.burn);
    this._scorch(sh, p.local, p.kind === "shield" ? 2.4 : 2.8);
    if (p.kind === "engine") {
      for (const m of sh.fxMats) { const v = m.uniforms.uPod.value; if (p.pod === 0) v.x = 0; else v.y = 0; }
      hud.toast(`${p.name} 파괴 — 적 기함 속도 저하${mine ? "  +400" : ""}`, "#ffd24a", 2, 22);
      hud.feed(`${sh.name}: ${p.name} 정지 — 고도가 떨어진다`, "#ffd24a");
    } else if (p.kind === "turret") {
      for (const tr of sh.turrets) if (tr.part === p) { tr.alive = false; tr.pitch = tr.under ? 0.3 : -0.32; tr.rec = 0; sh.tb.setColorAt(tr.k, _c.setRGB(0.22, 0.2, 0.19)); sh.tr.setColorAt(tr.k, _c); }
      sh.tb.instanceColor.needsUpdate = true; sh.tr.instanceColor.needsUpdate = true;
      this.turKills++;
      hud.toast(`${p.name} 파괴 — 아군 함대 전진${mine ? "  +400" : ""}`, "#ffd24a", 2, 22);
      if (this.flag[0] && !this.flag[0].dead) this._radio(this.flag[0].name, `적 ${p.name} 침묵 확인. 함대 전진한다!`, 2);
    } else if (p.kind === "shield") {
      const g = sh.model.userData.shieldGen; if (g) g.visible = false;
      fx.ring(sh.pos, COL[sh.style].beam, sh.L * 0.9, 0.9); fx.flash(sh.pos, COL[sh.style].beam, sh.L * 0.4, 0.4);
      this.bubbleOff = 1;
      hud.toast(`실드 붕괴! 코어 노출 — ${sh.name}을 노려라${mine ? "  +400" : ""}`, "#ffe07a", 2.6, 26);
      if (this.flag[0] && !this.flag[0].dead) this._radio(this.flag[0].name, "적 기함 실드 붕괴! 지금이다, 코어에 화력을 집중해!", 3);
    }
  }
  _bubbleTick(dt) {
    if (!this.bubble) return;
    const sh = this.flag[1], u = this.bubble.material.uniforms;
    u.uT.value = this.t;
    sh.hitK = Math.max(0, (sh.hitK || 0) - dt * 3); u.uHit.value = sh.hitK;
    if (this.bubbleOff !== undefined || sh.dead) { this.bubbleOff = Math.max(0, (this.bubbleOff ?? 1) - dt * 1.5); u.uOn.value = this.bubbleOff * (0.5 + 0.5 * Math.sin(this.t * 60)); if (this.bubbleOff <= 0) this.bubble.visible = false; }
  }

  // ── 아군 기함: 보급 ──
  _resupply(dt, me) {
    const al = this.flag[0], rs = this.rs;
    if (!al || al.dead || !this.ring) { if (this.ring) this.ring.visible = false; if (this.rbeam) this.rbeam.visible = false; return; }
    const c = this.c;
    const inside = !!(me && me.alive && me.pos.distanceTo(al.pos) < RESUPPLY_R);
    rs.k += ((inside ? 1 : 0) - rs.k) * Math.min(1, dt * 4);
    this.ring.visible = true;
    this.ring.position.set(al.pos.x, al.pos.y - al.H * 0.55, al.pos.z);
    this.ring.scale.setScalar(RESUPPLY_R * (1 + Math.sin(this.t * 2) * 0.01));
    this.ring.material.opacity = 0.16 + rs.k * 0.4 + Math.sin(this.t * 3) * 0.05;
    if (inside && !rs.in && this.s.time - rs.toastT > 25) { rs.toastT = this.s.time; this.s.hud.toast(`보급 구역 — ${al.name}이 체력·미사일 보충`, "#7fffd0", 1.8, 20); }
    rs.in = inside;
    const bm = this.rbeam;
    if (!inside) { bm.visible = false; return; }
    const mCap = 8 + ((c.L && c.L.mCap) || 0);
    const quiet = this.s.time - (me.hurtAt || -99) > 1.2;
    let work = false;
    if (me.hp < me.maxHp && quiet) { me.hp = Math.min(me.maxHp, me.hp + me.maxHp * 0.025 * dt); work = true; }
    if (me.missiles < mCap) {
      work = true;
      if ((rs.mT += dt) >= 3.5) { rs.mT = 0; me.missiles++; c.snd.play("pickup", 0.35); this.fx.ring(me.pos, 0x7fffd0, 3, 0.35); }
    } else rs.mT = 0;
    bm.visible = work;
    if (work) {
      const L = al.model.userData.launch;
      _a.set(L[0], L[1], L[2]).applyMatrix4(al.model.matrixWorld);
      bm.position.copy(_a); bm.lookAt(me.pos);
      const wv = 0.18 + Math.sin(this.t * 30) * 0.05;
      bm.scale.set(wv, wv, _a.distanceTo(me.pos));
      bm.material.opacity = 0.45 + Math.sin(this.t * 9) * 0.15;
      if (Math.random() < dt * 10) this.fx.puff(me.pos, 0x7fffd0, 0.6, 0.4, 0.8);
    }
  }

  // ── 아군 기함: 함포 지원 ──
  supportReady() { const al = this.flag[0]; return !!(al && !al.dead && this.supT <= 0 && !this.strike); }
  // 표적(락온한 적 액터)에 함포 일제 사격. 탄착 원으로 예고하고 약 3초 뒤 8발이 떨어진다. 성공하면 true
  supportStrike(target, manual = false) {
    const al = this.flag[0], me = this.mode.me, c = this.c;
    const say = (t) => { if (manual && this.s.time - this.supMsgT > 1.5) { this.supMsgT = this.s.time; this.s.hud.toast(t, "#9fd8ff", 1.4, 18); } };
    if (!al || al.dead) { say("아군 기함이 없다 — 함포 지원 불가"); return false; }
    if (this.strike) return false;
    if (this.supT > 0) { say(`함포 지원 재장전 ${Math.ceil(this.supT)}초`); return false; }
    if (!target || !target.alive || !me || !c.hostile(me, target)) { say("함포 지원: 먼저 적을 락온하라"); return false; }
    if (target.pos.distanceTo(al.pos) > 750) { say("함포 지원: 사거리 밖"); return false; }
    this.supT = SUPPORT_CD;
    this.strike = { tgt: target, n: 0 };
    const w = this._warn(target.pos, Math.max(10, target.radius * 1.4 + 6), 3.0, target, false, 0x5ab4ff);
    if (w) w.lock = 1.1;   // 발사 순간까지 표적을 따라가다 멈춘다
    this._event(1, 1.0, al, null);
    this.s.hud.toast(`함포 지원 요청 — ${target.name || "표적"}`, "#9fd8ff", 1.8, 22);
    this.s.hud.feed(`${al.name}: 좌표 수신, 일제 사격`, "#9fd8ff");
    this._radio(al.name, `좌표 수신. ${target.name || "표적"}에 함포 일제 사격 — 탄착 3초, 물러나라!`, 3);
    c.snd.play("radio", 0.35);
    return true;
  }
  _strikeFire() {
    const st = this.strike, al = this.flag[0];
    if (!st || !al || al.dead) { this.strike = null; return; }
    const t = st.tgt, guns = al.turrets;
    _a.copy(t.pos);
    for (let k = 0; k < 8; k++) {
      const sl = this._shell(); if (!sl) break;
      const tr = guns[k % guns.length];
      sl.delay = 0.01 + k * 0.09; sl.t = 0; sl.src = al; sl.tr = tr; sl.kind = 1; sl.color = COL.ally.shell; sl.tgt = t; sl.tgtShip = null; sl.dmg = 75; sl.R = 9;
      this._muzzle(al, tr, sl.from); sl.prev.copy(sl.from);
      sl.T = 1.9 - sl.delay;
      sl.to.copy(_a).addScaledVector(t.vel, sl.T * 0.9 + sl.delay).add(_b.set(rnd(-1, 1), rnd(-0.5, 0.5), rnd(-1, 1)).multiplyScalar(k < 3 ? 1 : 3.5));
      sl.h = clamp(sl.from.distanceTo(sl.to) * 0.2, 12, 55);
    }
    this._snd("missile", al.pos, 1, 0.45);
    this.strike = null;
  }
  // 함포 지원 탄 명중: 표적 직격 + 주변 적 반경 피해 (피해는 요청한 플레이어 몫 — 아군·나는 맞지 않는다)
  _strikeHit(sl, p) {
    const c = this.c, me = this.mode.me, t = sl.tgt;
    if (!me) return;
    if (t && t.alive && t.pos.distanceTo(p) < (t.radius || 1) + 6) c.damage(t, sl.dmg, me, p);
    for (const o of c.actors) {
      if (o === t || !o.alive || !o.targetable || !c.hostile(me, o)) continue;
      const d = o.pos.distanceTo(p) - (o.radius || 1);
      if (d < sl.R) c.damage(o, sl.dmg * 0.4 * (1 - Math.max(0, d) / sl.R), me, p);
    }
  }
  // 큰 표적을 오래 락온하고 있으면 자동으로 요청 (터치·패드에서도 쓸 수 있게)
  _autoSupport() {
    const c = this.c, t = c.lock;
    if (!t || !this.supportReady() || c.lockT < 1.4 || !t.alive) return;
    if (t.flagPart || t.flagship || t.kind === "turret" || t.kind === "core" || t.bossBar || (t.unit && t.unit.root === t) || t.botKind === "gunship" || t.botKind === "boss") this.supportStrike(t);
  }

  // ── 함재기 (장식용 공중전) ──
  _fighters(dt) {
    const w = this.w, fx = this.fx;
    for (const side of [0, 1]) {
      this.fT[side] -= dt;
      if (this.fT[side] > 0) continue;
      let mine = 0, nc = 0, pick = null;
      for (const f of this.fighters) if (f.side === side && f.alive) mine++;
      for (const s of this.ships) if (s.side === side && !s.dead) { nc++; if (Math.random() < 1 / nc) pick = s; }
      if (mine < this.maxF && pick) { this.fT[side] = rnd(5, 9); this._launch(pick); } else this.fT[side] = 1;
    }
    for (let i = this.fighters.length - 1; i >= 0; i--) {
      const f = this.fighters[i];
      for (let k = f.bolts.length - 1; k >= 0; k--) { const b = f.bolts[k]; b.p.addScaledVector(b.d, 160 * dt); if ((b.life -= dt) <= 0) f.bolts.splice(k, 1); }
      if (!f.alive) { if (!f.bolts.length) { w.scene.remove(f.model); if (f.model.userData.dispose) f.model.userData.dispose(); this.fighters.splice(i, 1); } continue; }
      f.t += dt;
      if (!f.tgt || !f.tgt.alive || (f.retT -= dt) <= 0) {
        f.retT = rnd(4, 7);
        let n = 0; f.tgt = null;
        for (const o of this.fighters) if (o.side !== f.side && o.alive && Math.random() < 1 / ++n) f.tgt = o;
        if (Math.random() > 0.7) f.tgt = null;
        n = 0; f.ship = null;
        for (const s of this.ships) if (s.side !== f.side && !s.dead && Math.random() < 1 / ++n) f.ship = s;
        f.offs.set(rnd(-1, 1), rnd(-0.3, 0.6), rnd(-1, 1)).normalize().multiplyScalar(rnd(22, 40));
      }
      const goal = _a;
      if (f.tgt) goal.copy(f.tgt.pos).addScaledVector(f.tgt.vel, 0.4);
      else if (f.ship) goal.copy(f.ship.pos).add(f.offs);
      else goal.copy(f.home);
      const minY = w.h(f.pos.x, f.pos.z) + 25, maxY = (w.ceiling || 200) - 8;
      if (goal.y < minY) goal.y = minY;
      const want = _b.copy(goal).sub(f.pos).normalize().multiplyScalar(f.spd);
      if (f.pos.y < minY) want.y = Math.abs(want.y) + 10;
      if (f.pos.y > maxY) want.y = -Math.abs(want.y) - 5;
      const lim = w.size - 15; if (Math.abs(f.pos.x) > lim || Math.abs(f.pos.z) > lim) want.set(-f.pos.x, 0, -f.pos.z).normalize().multiplyScalar(f.spd);
      f.vel.lerp(want, Math.min(1, dt * 1.3));
      f.pos.addScaledVector(f.vel, dt);
      f.model.position.copy(f.pos);
      _v.copy(f.pos).add(f.vel); _m4.lookAt(f.pos, _v, THREE.Object3D.DEFAULT_UP); f.model.quaternion.setFromRotationMatrix(_m4);
      if (f.model.userData.tick) f.model.userData.tick(dt, 0.8, this.t);
      const tp = f.tgt ? f.tgt.pos : f.ship ? f.ship.pos : null;
      if (tp && (f.gun -= dt) <= 0) {
        const to = _v.copy(tp).sub(f.pos), d = to.length();
        if (d < 110 && to.normalize().dot(_b.copy(f.vel).normalize()) > 0.9) {
          f.gun = 0.11; f.burst = (f.burst || 0) + 1; if (f.burst > 6) { f.burst = 0; f.gun = rnd(0.8, 1.6); }
          if (f.bolts.length < 8) { const d0 = new V3().copy(_b); d0.x += rnd(-0.03, 0.03); d0.y += rnd(-0.03, 0.03); d0.normalize(); f.bolts.push({ p: f.pos.clone(), d: d0, life: Math.min(0.7, d / 160), c: f.side ? COL[this.enemyStyle].tracer : COL.ally.tracer }); }
          if (f.tgt && d < 70 && Math.random() < 0.05) this._fighterDown(f.tgt);
          if (!f.tgt && f.ship && d < 60 && Math.random() < 0.2 && f.ship.actor.alive) { this._hurt(f.ship, 2, null, f.ship.pos); fx.hitSpark(this._hullPoint(f.ship, _s), _b, 0xffd27a, 4, false, false); }
        } else f.gun = 0.2;
      }
      if (f.t > 70) this._fighterDown(f);
    }
  }
  _launch(cs) {
    const side = cs.side, model = side ? (factionModel(this.enemyStyle, "jet", 0xff2d3d) || makeEscortCraft(0xb03040)) : makeEscortCraft(0x2f6fb0);
    model.scale.multiplyScalar(side ? 1 : 1.1);
    this.w.scene.add(model);
    const L = cs.model.userData.launch;   // 격납고 통로(기함) 또는 배 밑에서 나온다
    const p = new V3(L[0], L[1], L[2]).applyMatrix4(cs.model.matrixWorld);
    const rx = Math.cos(cs.yaw), rz = -Math.sin(cs.yaw), toE = this.axis.x * rx * (side ? -1 : 1) + this.axis.z * rz * (side ? -1 : 1) > 0 ? 1 : -1;
    const fwd = cs.model.userData.hangar ? new V3(rx * toE, -0.05, rz * toE) : new V3(-Math.sin(cs.yaw), -0.3, -Math.cos(cs.yaw)).normalize();
    this.fighters.push({ side, model, pos: p, vel: fwd.multiplyScalar(26), spd: rnd(30, 38), alive: true, t: 0, gun: 1, bolts: [], tgt: null, ship: null, retT: 0, home: cs.pos.clone(), offs: new V3() });
    this.fx.flash(p, side ? 0xff6a4a : 0x7fd0ff, 2.5, 0.2);
  }
  _fighterDown(f) {
    if (!f.alive) return;
    f.alive = false; f.model.visible = false;
    this.fx.explosion(f.pos, 0.9); this.fx.debrisBurst(f.pos, 0x5a6070, 6, 10, 0.25);
    this._snd("explode", f.pos, 0.4);
  }

  // ── 격침 ──
  _sink(sh) {
    sh.dead = true; sh.deadT = 0; sh.vy = 0; sh.rollV = (Math.random() < 0.5 ? -1 : 1) * rnd(0.12, 0.22); sh.pitchV = rnd(0.04, 0.09);
    for (const cc of sh.cols) cc.off = true;
    sh.hit.visible = false;   // 충돌 상자 끄기
    if (sh.parts) for (const p of sh.parts) { if (p.actor.alive) { p.actor.alive = false; p.actor.hp = 0; } p.alive = false; p.hit.visible = false; }
    for (const m of sh.fxMats) m.uniforms.uPod.value.set(0, 0, 0, 0);
    const fx = this.fx, hud = this.s.hud, me = this.mode.me;
    fx.destroy(sh.pos, 3.2);
    for (let k = 0; k < 3; k++) fx.destroy(this._hullPoint(sh, _a), 1.8);
    fx.debrisBurst(sh.pos, sh.side ? 0x3a3f4a : 0xc8d0dc, 22, 22, 1.1);
    this._blast(sh.pos, 0.6);
    this._snd("explode", sh.pos, 1.3, 0.7);
    if (sh.side) {
      const mine = me && sh.actor.ai.lastHit === me;
      hud.feed(`적 기함 격침 — ${sh.name}`, "#35ff7a");
      if (mine) { me.score += sh.big ? 2500 : 1500; hud.toast(`${sh.name} 격침!  +${sh.big ? 2500 : 1500}`, "#ffd24a", 2.6, 28); }
      else hud.toast(`${sh.name} 격침!`, "#35ff7a", 2.2, 26);
      if (sh.big && this.flag[0] && !this.flag[0].dead) this._radio(this.flag[0].name, `${sh.name} 격침 확인! 전 함대, 전진!`, 3);
    } else {
      hud.feed(`아군 함선 피격 침몰 — ${sh.name}`, "#ff6b5a");
      hud.toast(`${sh.name} 격침… 함대가 흔들린다`, "#ff6b5a", 2.4, 24);
    }
    for (const f of this.fighters) if (f.ship === sh) f.ship = null;
  }
  // 격침된 함선: 불타며 기울어 추락하다 땅에 닿으면 큰 폭발
  _dying(sh, dt) {
    const fx = this.fx, g = sh.model, w = this.w;
    if (sh.sunk) return;
    sh.deadT += dt;
    sh.vy -= 3.2 * dt;
    g.position.y += sh.vy * dt;
    g.position.x += -Math.sin(sh.yaw) * 5 * dt; g.position.z += -Math.cos(sh.yaw) * 5 * dt;
    g.rotation.z += sh.rollV * dt; g.rotation.x -= sh.pitchV * dt;
    sh.pos.copy(g.position);
    g.updateMatrixWorld(true);
    if (Math.random() < dt * 6) { fx.explosion(this._hullPoint(sh, _a), rnd(1, 2)); fx.smoke(_a, 3.2, 3, 0.07, 2); }
    if (Math.random() < dt * 14) { this._hullPoint(sh, _a); fx.smoke(_a, 3, 3.6, 0.06, 1.6); fx.burst(_a, 0xff7a2a, 3, 3, 0.6, 1.8, -2); }
    if (Math.random() < dt * 0.8) fx.debrisBurst(this._hullPoint(sh, _a), 0x3a3f4a, 5, 12, 0.6);
    if (g.position.y < w.h(g.position.x, g.position.z) + 2 || sh.deadT > 14) {
      sh.sunk = true;
      fx.destroy(g.position, 5); fx.ring(g.position, 0xffc98a, 60, 1.1); fx.debrisBurst(g.position, 0x3a3f4a, 26, 26, 1.2);
      this._snd("explode", g.position, 1.4, 0.6);
      this._blast(g.position, 0.8);
      g.visible = false;
    }
  }

  // ── HUD (mode.hud 뒤에 그린다) ──
  hud(h) {
    const m = this.mode, me = m.me;
    if (h.lvl === "off" || m.cut || !me || m.state === "done" || (m.state === "countdown" && m.time < 0)) return;
    const u = h.u, L = h.L, g = h.g, cam = this.s.camera, pr = this._pr;
    // 1) 전선 막대: 가운데 위 (드론 함대전 막대가 있으면 그 아래)
    let nb = 0; for (const a of this.c.actors) if (a.alive && a.bossBar && a.targetable) nb++;
    const W = 250 * u, x = L.cx - W / 2, y = L.subY + 2 * u + (m.swarm ? 70 * u : 0) + nb * 44 * u;
    h.plate(x, y, W, 24 * u, { fill: "rgba(10,16,30,0.72)", skew: 0.14, accent: "#5aa9ff" });
    h.text("전선", x + 20 * u, y + 12.5 * u, { size: 10.5, base: "middle", color: "#ffd24a", shadow: false });
    const bx = x + 50 * u, bw = W - 70 * u, by = y + 9 * u, bh = 7 * u, f = (this.front + 1) / 2;
    g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(bx - 1.5 * u, by - 1.5 * u, bw + 3 * u, bh + 3 * u);
    g.fillStyle = "#4aa0ff"; g.fillRect(bx, by, bw * f, bh);
    g.fillStyle = "#ff4a5a"; g.fillRect(bx + bw * f, by, bw * (1 - f), bh);
    g.fillStyle = "#fff"; g.fillRect(bx + bw * f - 1.5 * u, by - 3 * u, 3 * u, bh + 6 * u);
    h.text(`${this.alive(0)}:${this.alive(1)}`, x + W - 12 * u, y + 12.5 * u, { size: 10, align: "right", base: "middle", color: "#b4c2d4", shadow: false });
    // 2) 적 기함 약점 표시 (가까울 때)
    const ef = this.flag[1];
    if (ef && !ef.dead && ef.parts && me.alive) {
      const d = me.pos.distanceTo(ef.pos);
      if (d < 340) {
        const fade = clamp((340 - d) / 60, 0, 1);
        g.save(); g.globalAlpha = fade * h.opacity;
        for (const p of ef.parts) {
          h.project(p.actor.pos, cam, pr);
          if (!pr.on) continue;
          const s = 7 * u;
          g.beginPath(); g.moveTo(pr.x, pr.y - s); g.lineTo(pr.x + s, pr.y); g.lineTo(pr.x, pr.y + s); g.lineTo(pr.x - s, pr.y); g.closePath();
          if (!p.alive) { h.stroke2("rgba(150,150,150,0.8)", 1.6 * u); h.text("✕", pr.x, pr.y + 4 * u, { size: 10, align: "center", color: "#aaa" }); continue; }
          const k = p.actor.hp / p.actor.maxHp, col = p.kind === "shield" ? "#7fe6ff" : p.kind === "engine" ? "#ffb02e" : "#ff6a5a";
          h.stroke2(col, 2 * u);
          if (p.actor === this.c.lock || p.actor === this.c.aim || Math.hypot(pr.x - L.cx, pr.y - L.cy) < 110 * u) h.text(p.name, pr.x, pr.y - s - 9 * u, { size: 10.5, align: "center", color: col });   // 이름은 조준선 근처·조준 중인 부위만 (겹침 방지)
          h.bar(pr.x - 20 * u, pr.y - s - 6 * u, 40 * u, 3.5 * u, k, col);
        }
        h.project(ef.pos, cam, pr);
        if (pr.on) {
          const up = ef.shieldPart && ef.shieldPart.alive;
          h.text(up ? "코어 — 실드 보호 중" : "코어 노출!", pr.x, pr.y + 22 * u, { size: 12, align: "center", color: up ? "#7fe6ff" : "#ffe07a" });
          h.bar(pr.x - 34 * u, pr.y + 28 * u, 68 * u, 4 * u, ef.actor.hp / ef.actor.maxHp, up ? "#7fe6ff" : "#ffe07a");
        }
        g.restore();
      }
    }
    // 3) 나를 노린 탄막 경고
    let wmin = 1e9, wsel = null;
    for (const w of this.warns) if (w.on && w.me) { const dd = w.pos.distanceTo(me.pos) - w.r; if (dd < wmin) { wmin = dd; wsel = w; } }
    if (wsel && wmin < 10) {
      const left = Math.max(0, wsel.T - wsel.t);
      h.banner(wmin < 0 ? `⚠ 탄착 지점 안! 벗어나라 ${left.toFixed(1)}초` : `⚠ 포격 경고 ${left.toFixed(1)}초`, h.H * 0.3, "#ff6a4a", wmin < 0 ? 20 : 17);
    }
    // 4) 보급 · 함포 지원 상태 (오른쪽 가운데 아래)
    const rx = L.r, ry = h.H * 0.64;
    if (this.rs.in && this.rbeam && this.rbeam.visible) h.text("✚ 보급 중", rx, ry - 20 * u, { size: 13, align: "right", color: "#7fffd0" });
    const al = this.flag[0];
    if (al && !al.dead) {
      const key = L.touch ? "락온 유지" : "[G]";
      const txt = this.strike ? "함포 지원 — 발사 중" : this.supT > 0 ? `함포 지원 ${Math.ceil(this.supT)}초` : `함포 지원 준비 · ${key}`;
      h.text(txt, rx, ry, { size: 12, align: "right", color: this.supT > 0 || this.strike ? "#8aa0b8" : "#9fd8ff" });
    }
  }

  // 남은 함선 수 (결과·HUD 용)
  alive(side) { let n = 0; for (const s of this.ships) if (s.side === side && !s.dead) n++; return n; }

  dispose() {
    const sc = this.w.scene;
    if (this._hud0) { this.mode.hud = this._hud0; this._hud0 = null; }
    if (typeof window !== "undefined") window.removeEventListener("keydown", this._key);
    for (const sh of this.ships) {
      sc.remove(sh.model);
      sh.model.traverse((o) => { if (o.isMesh && o.material && o.material.isShaderMaterial && o.material !== this.mats.fx) o.material.dispose(); });
      for (const k of Object.values(sh.model.userData.meshes)) k.geometry.dispose();
      const sg = sh.model.userData.shieldGenMeshes; if (sg) for (const k of Object.values(sg)) k.geometry.dispose();
      sh.model.userData.coneGeo.dispose(); sh.model.userData.coneMat.dispose();
      sh.tb.dispose(); sh.tr.dispose(); sh.scorch.dispose();
      for (const cc of sh.cols.concat(sh.partCols || [])) cc.off = true;
    }
    for (const f of this.fighters) { sc.remove(f.model); if (f.model.userData.dispose) f.model.userData.dispose(); }
    for (const b of this.beams) { sc.remove(b.m); b.m.material.dispose(); }
    for (const w of this.warns) { sc.remove(w.m); w.m.material.dispose(); }
    if (this.ring) { sc.remove(this.ring); this.ring.geometry.dispose(); this.ring.material.dispose(); }
    if (this.rbeam) { sc.remove(this.rbeam); this.rbeam.material.dispose(); }
    if (this.bubble) { this.bubble.geometry.dispose(); this.bubble.material.dispose(); }
    this.beamGeo.dispose(); this.warnGeo.dispose(); this.scorchGeo.dispose();
    for (const k in this.tgeo) { this.tgeo[k].body.dispose(); this.tgeo[k].barrel.dispose(); }
    this.mats.dispose();
    this.ships = []; this.fighters = []; this.parts = [];
  }
}
