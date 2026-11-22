// 전투 시스템: 액터(플레이어·AI 드론·포탑·코어·호송 차량), 레이저·미사일, 아이템, 피해·격추, 전투 HUD
import * as THREE from "../vendor/three.module.min.js";
import { buildDrone, botLook } from "./dronemodel.js";
import { mergeStatic } from "./mergemodel.js";
import { DIFFICULTY, settings, clamp } from "./config.js";
import { Units, buildJet } from "./enemies.js";
import { factionModel } from "./factions.js";
import * as GP from "./garage.js";
import { SkillSys } from "./skills.js";
import { rollRank, rankStats, baseLevel, clampRank } from "./ranks.js";

export const ITEMS = {
  repair: { name: "수리 키트", color: 0x35ff7a, instant: true, icon: "✚" },
  missiles: { name: "미사일 팩", color: 0xff8a1f, instant: true, icon: "▲" },
  shield: { name: "실드", color: 0x21d4fd, icon: "◈" },
  boost: { name: "부스터", color: 0xffe14a, icon: "»" },
  overcharge: { name: "과충전", color: 0xff4ad6, icon: "ϟ" },
  emp: { name: "EMP", color: 0xb8c8ff, icon: "✺" },
};
export const ITEM_SLOTS = 2;   // 보관 아이템은 두 개까지. 가득 차면 더 집을 수 없다
const ITEM_POOL = ["repair", "repair", "repair", "missiles", "missiles", "missiles", "shield", "shield", "boost", "overcharge", "emp"];
const CALLSIGNS = ["독수리", "송골매", "까치", "올빼미", "참매", "황조롱이", "두루미", "갈매기", "부엉이", "제비", "물수리", "직박구리", "말똥가리", "솔부엉이"];
export const TEAM_COLOR = [0x2f8cff, 0xff2d3d, 0xb44cff, 0xff8a1f];
export const TEAM_CSS = ["#5aa9ff", "#ff5a66", "#c77dff", "#ff9a3a"];

// AI 드론 종류
export const KINDS = {
  grunt: { hp: 70, radius: 0.9, scale: 2.6, speed: 19, accel: 15, dmg: 6, rate: 4, range: 26, missiles: 1, score: 100 },
  ace: { hp: 100, radius: 0.9, scale: 2.6, speed: 25, accel: 21, dmg: 7, rate: 5, range: 30, missiles: 2, score: 150 },
  kamikaze: { hp: 34, radius: 0.8, scale: 2.2, speed: 27, accel: 24, dmg: 0, rate: 0, range: 0, missiles: 0, score: 80, boom: 38 },
  gunship: { hp: 240, radius: 1.7, scale: 5, speed: 12, accel: 8, dmg: 8, rate: 6, range: 38, missiles: 6, score: 300 },
  jet: { hp: 60, radius: 1.3, scale: 1, speed: 34, accel: 16, dmg: 5, rate: 6, range: 44, missiles: 2, score: 180, model: buildJet, name: "전투기" },   // 빠르게 스쳐 지나가며 쏜다
  boss: { hp: 1500, radius: 5.5, scale: 17, speed: 8, accel: 4, dmg: 9, rate: 7, range: 55, missiles: 99, score: 2000 },
};

const HIT_T = 0.32;               // 조준선 명중 표시가 남는 시간(초)
const LASER_SPEED = 170;         // 플레이어 레이저 탄속(m/s). 적 탄은 더 느려 보고 피할 수 있다
export const PLAYER_HP = 150, BOT_HP = 1.5, SHIELD_HP = 120;
const RESPAWN = 5, RESPAWN_ME = 3;
const HITBOX = 1.3;       // 내가 쏜 레이저·미사일의 명중 판정 배율 (포탑·코어 등 구조물만, 적 드론은 1배)
const hb = (o) => (o.kind === "bot" || o.remote ? 1 : HITBOX);        // 격추 후 재출격까지(초)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _des = new THREE.Vector3(), _aim = new THREE.Vector3();
const _hit = { depth: 0, normal: new THREE.Vector3(), collider: null };
const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const _s = {};

// 고속 회피: 최대 충전 · 한 칸 다시 차는 시간(초) · 무적 시간 · 밀어내는 속도(m/s)
export const DODGE = { max: 2, cool: 6, iframe: 0.45, push: 26 };

// 리스폰 직후 무적 시간(초)
export const SPAWN_GOD = 3;

export class Combat {
  // handlers: { ffa, onKill(victim, killer), onDamage(victim, amount, attacker), spawnPoint(actor), items(개수) }
  constructor(session, handlers = {}) {
    this.s = session; this.w = session.world; this.fx = session.fx; this.snd = session.game.sound;
    this.feel = session.feel;      // 화면 효과 관리자: 공격·명중·피해 사건을 알린다
    this.h = handlers;
    this.ffa = !!handlers.ffa;
    this.L = handlers.baseStats ? GP.baseLoadout() : GP.loadout();   // 격납고 파츠·효과 (PvP: 파츠 능력치 미적용, 외형 효과만)
    this.skillK = handlers.skillK ?? 1;         // 스킬이 주는 피해 배율 (PvP 0.6)
    this._sk = 0;                                // > 0: 지금 스킬이 피해를 주는 중 (스킬 탄·미사일은 skl 표시로 이어 받는다)
    this._net = false;                           // 네트워크로 받은 피해를 적용하는 중
    this.lockNeed = 0.7 * Math.max(0.35, 1 + this.L.lock);
    const sense = 170 * Math.max(0.5, 1 + this.L.range);   // 센서 부품: 조준 보조·락온 거리
    this.aimRange = sense * 1.1;     // 레이저 조준점(조준 보조) 범위 10% 확대
    this.lockRange = sense * 1.15;   // 미사일 락온(공격) 범위 15% 확대
    this.diff = DIFFICULTY[session.cfg.difficulty || settings.difficulty] || DIFFICULTY.normal;
    this.actors = []; this.shots = []; this.missiles = []; this.pickups = [];
    this.id = 1;
    this.hurtT = 0; this.hurtDir = new THREE.Vector3(); this.warn = 0; this.hitMark = 0;
    this.lock = null; this.lockT = 0; this.aim = null;
    this.killMark = 0;             // 내가 격파한 직후 잠깐 > 0 (HUD 격파 표시용)
    this.killName = ""; this.killBig = 1; this.killStreak = 0; this.killAt = -99;   // 격파 표시: 이름·크기·연속 격파 수
    this.hitKind = "hp"; this.hitAmt = 0;   // 마지막 명중: hp | shield, 피해량 (조준선 명중 표시)
    this.hurts = [];               // 피격 방향 표시: { pos, t, amt } (여러 방향에서 동시에 맞으면 각각)
    this.hurtAmt = 0;              // 마지막으로 받은 피해량
    this.warnDist = 999;           // 나를 쫓는 미사일까지의 최소 거리(m)
    this.missileGeo = new THREE.CylinderGeometry(0.1, 0.24, 1.9, 8);
    this.mGlowGeo = new THREE.SphereGeometry(0.75, 12, 8);
    this.missileGeo.rotateX(Math.PI / 2);
    this.missileMat = new THREE.MeshLambertMaterial({ color: 0xe9edf2, emissive: 0x552200 });
    this.pickGeo = new THREE.OctahedronGeometry(1.15, 0);
    this.ringGeo = new THREE.TorusGeometry(1.8, 0.09, 6, 32);
    this.beamGeo = new THREE.CylinderGeometry(0.32, 0.32, 44, 8, 1, true);
    this.haloGeo = new THREE.SphereGeometry(2.3, 16, 10);
    this.extra = [];
    this.level = baseLevel(session.cfg, session.cfg.difficulty || settings.difficulty);   // 이 판 적들의 기준 계급
    this.units = new Units(this);     // 전차·대공 로봇·전투함·거대로봇
    this.botN = 0;
  }

  hostile(a, b) { return a !== b && a.alive && b.alive && (this.ffa || a.team !== b.team); }
  volAt(p) { return clamp(1.15 - this.s.camera.position.distanceTo(p) / 140, 0, 1); }
  // 소리의 좌우 위치(-1..1): 카메라 기준 오른쪽이 +
  panAt(p) {
    const cam = this.s.camera;
    _p1.copy(p).sub(cam.position);
    const d = _p1.length();
    if (d < 0.5) return 0;
    return clamp(_p1.dot(_p2.set(1, 0, 0).applyQuaternion(cam.quaternion)) / d, -1, 1) * 0.85;
  }
  // 폭발이 가까우면 화면을 흔든다. power: 폭발 크기(1 = 드론)
  _blast(pos, power) {
    const p = this.player;
    if (!p || !p.alive) return;
    const d = pos.distanceTo(p.pos), R = 16 + 14 * power;
    if (d < R) this.feel.emit("blast", Math.min(1, (1 - d / R) * (0.55 + 0.2 * power)), pos);
  }

  _actor(o) {
    const a = Object.assign({
      id: this.id++, name: "", kind: "bot", team: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(),
      radius: 0.9, hp: 100, maxHp: 100, shield: 0, shieldT: 0, alive: true, respawns: false, respawnT: 0, score: 0, kills: 0, deaths: 0,
      heat: 0, overheated: false, fireT: 0, missiles: 0, missileT: 0, items: [], sel: 0, boostT: 0, overT: 0, stunT: 0,
      model: null, ai: null, static: false, targetable: true, invulnerable: false, flash: 0,
    }, o);
    this.actors.push(a);
    return a;
  }

  // ── 액터 생성 ──
  addPlayer(team = 0, name = "나") {
    const pl = this.s.player, b = pl.body;
    this.player = this._actor({ name, kind: "player", team, pos: b.pos, vel: b.vel, quat: b.quat, radius: Math.max(0.45, b.radius * 2), hp: PLAYER_HP * (1 + this.L.hp), maxHp: PLAYER_HP * (1 + this.L.hp), missiles: 4 + this.L.mStart, respawns: true, isPlayer: true });
    const sm = new THREE.Mesh(new THREE.SphereGeometry(0.42 * pl.cls.scale + 0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0x21d4fd, transparent: true, opacity: 0.25, depthWrite: false }));
    sm.visible = false;
    pl.model.add(sm);
    this.shieldMesh = sm;
    return this.player;
  }

  spawnBot(o = {}) {
    const kind = o.kind || "grunt", K = KINDS[kind], team = o.team ?? 1;
    const col = this.ffa ? [0xff2d3d, 0xffc400, 0xb44cff, 0x35ff7a, 0xff7a1a, 0x21d4fd, 0xff5ad6, 0xffffff, 0x9be15d][this.botN % 9] : TEAM_COLOR[team];
    // 적은 계급을 갖는다: 포인트 색·불빛·고리가 계급 색, 능력치도 계급만큼 오른다 (아군은 계급 없이 흰 고리)
    const enemy = this.ffa || team !== 0, rk = enemy ? rankStats(o.rank !== undefined ? clampRank(o.rank) : rollRank(this.level, kind)) : null;
    const look = botLook(kind, this.ffa ? 1 : team);
    if (rk) { const hex = "#" + rk.color.toString(16).padStart(6, "0"); look.accentColor = hex; look.ledColor = hex; look.propColor = hex; }
    // 에일(외계) 진영: 짙은 보라 생체 외피, 촉수형 프레임, 보랏빛 날개 (포인트 색은 계급 색 유지)
    if (enemy && this.s.cfg.faction === "ail") Object.assign(look, { frame: kind === "gunship" || kind === "boss" ? "hexa" : "tri", canopy: "pod", skin: "solid", frameColor: "#1c0d33", propColor: "#c060ff", ledColor: "#e0b0ff", ledMode: "blink" });
    const fm = enemy && this.s.cfg.faction ? factionModel(this.s.cfg.faction, kind, rk ? rk.color : 0xff2d3d) : null;   // 진영 외형 (기계 병기 / 외계 생명체)
    const model = fm || (K.model ? K.model(rk ? rk.color : 0xe8f4ff) : buildDrone(look, K.scale, { halo: this.multi ? TEAM_COLOR[team] : rk ? rk.color : 0xe8f4ff }));   // 4팀전: 고리는 팀 색, 포인트는 계급 색
    mergeStatic(model);   // 부품을 재질별로 합쳐 그리기 호출을 줄인다 (움직이는 부품은 그대로)
    this.w.scene.add(model);
    const skill = this.diff.bot * (o.skill || 1) * (rk ? rk.skill : 1), hpk = rk ? rk.hp : 1;
    const a = this._actor({
      name: (rk ? rk.name + " " : "") + (o.name || (enemy && this.s.cfg.faction === "ail" ? `에일 ${K.name || "추적체"}` : K.name || CALLSIGNS[this.botN % CALLSIGNS.length])), rk, kind: "bot", botKind: kind, team, model, color: col,
      radius: K.radius, hp: K.hp * (o.hpScale || 1) * (kind === "boss" ? 1 : BOT_HP) * hpk, maxHp: K.hp * (o.hpScale || 1) * (kind === "boss" ? 1 : BOT_HP) * hpk, missiles: K.missiles, respawns: !!o.respawns, K,
      ai: {
        think: Math.random() * 0.3, target: null, los: false, goal: null, roam: null, orbit: Math.random() < 0.5 ? 1 : -1, altOff: Math.random() * 6 - 1,
        yaw: 0, burst: 0, cool: Math.random() * 1.5, skill, focus: o.focus || null, leader: o.leader || null, slot: o.slot || 0, home: o.home || null,
        range: K.range * (0.85 + Math.random() * 0.3), lastHit: null, lastHitT: 0, stuck: 0, mcool: 3 + Math.random() * 5,
      },
    });
    this.botN++;
    a.pos.copy(o.pos || this.randomPoint());
    model.position.copy(a.pos);
    if (kind === "gunship" || kind === "boss") this.fitBody(a);
    return a;
  }

  // 덩치 큰 드론(중간 보스·보스): 이동 충돌 반경을 실제 모델 크기에 맞춘다 (명중 판정 반경 a.radius 는 그대로)
  fitBody(a) {
    if (!a.model) return;
    a.model.position.copy(a.pos); a.model.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(a.model), sz = bb.getSize(new THREE.Vector3());
    if (!isFinite(sz.x)) return;
    a.bodyR = Math.max(a.radius, Math.max(sz.x, sz.z) * 0.5, sz.y * 0.6);
  }

  // 고정 포탑: 사거리 안의 적을 조준 사격
  spawnTurret(x, z, team = 1, o = {}) {
    const y = this.w.h(x, z), g = new THREE.Group(), col = TEAM_COLOR[team];
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.5, metalness: 0.6 }), tc = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2) });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 2.2, 10), dark); base.position.y = 1.1; base.castShadow = true; g.add(base);
    const head = new THREE.Group(); head.position.y = 2.7; g.add(head);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.9), dark); hb.castShadow = true; head.add(hb);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 1.96), tc); strip.position.y = 0.2; head.add(strip);
    for (const sx of [-0.4, 0.4]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.8, 8), dark); br.rotation.x = Math.PI / 2; br.position.set(sx, 0, -1.6); head.add(br); }
    g.position.set(x, y, z);
    this.w.scene.add(g);
    const collider = this.w.col.addCapsule(new THREE.Vector3(x, y + 1, z), new THREE.Vector3(x, y + 2.6, z), 1.3, "turret");
    const a = this._actor({
      name: o.name || "포탑", kind: "turret", team, model: g, head, static: true, radius: 1.9, hp: o.hp || 150, maxHp: o.hp || 150, collider,
      ai: { think: 0, target: null, burst: 0, cool: 1 + Math.random(), yaw: 0, pitch: 0, range: o.range || 80, skill: this.diff.bot },
    });
    a.pos.set(x, y + 2.7, z);
    collider.owner = a;   // 받침에 맞은 탄도 포탑 피해로
    return a;
  }

  // 기지 코어(목표물)
  spawnCore(x, z, team = 0, o = {}) {
    const y = this.w.h(x, z), g = new THREE.Group(), col = TEAM_COLOR[team];
    const dark = new THREE.MeshStandardMaterial({ color: 0x2f3643, roughness: 0.5, metalness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.4) });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5, 1.2, 12), dark); base.position.y = 0.6; base.receiveShadow = true; g.add(base);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 4, 8), dark); pil.position.y = 3; pil.castShadow = true; g.add(pil);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 1), glow); orb.position.y = 6.6; g.add(orb);
    const rings = [];
    for (let i = 0; i < 2; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.3 + i * 0.5, 0.12, 6, 36), dark); r.position.y = 6.6; g.add(r); rings.push(r); }
    g.position.set(x, y, z);
    this.w.scene.add(g);
    const c1 = this.w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 4.5, z), 1.4, "core");
    const c2 = this.w.col.addSphere(new THREE.Vector3(x, y + 6.6, z), 2.3, "core");
    const a = this._actor({ name: o.name || "코어", kind: "core", team, model: g, static: true, radius: 3, hp: o.hp || 700, maxHp: o.hp || 700, collider: c1, collider2: c2, orb, rings });
    a.pos.set(x, y + 6.6, z);
    c1.owner = a; c2.owner = a;   // 기둥·받침에 맞은 탄도 이 코어(지휘소)의 피해로
    return a;
  }

  // 외부에서 움직이는 액터(호송 수송함 등). pos/vel 은 호출자가 갱신한다
  addProp(model, o) {
    const a = this._actor(Object.assign({ kind: "prop", model, static: true }, o));
    return a;
  }

  // 터치 버튼에 지금 쓸 아이템과 교체 대상을 적는다
  _itemButtons(p) {
    const key = p.items.join(",") + "|" + p.sel;
    if (key === this._btnKey) return;
    this._btnKey = key;
    const use = document.querySelector("#touch .b-item"), sw = document.querySelector("#touch .b-swap");
    if (!use || !sw) return;
    const cur = ITEMS[p.items[p.sel]], other = p.items.length > 1 ? ITEMS[p.items[1 - p.sel]] : null;
    const css = (it) => "#" + it.color.toString(16).padStart(6, "0");
    use.textContent = cur ? `${cur.icon} ${cur.name}` : "아이템"; use.style.color = cur ? css(cur) : ""; use.style.borderColor = cur ? css(cur) : ""; use.disabled = !cur;
    sw.hidden = !other; if (other) sw.textContent = `⇄ ${other.name}`;
  }

  // ── 아이템 ──
  addPickup(pos, type) {
    type = type || ITEM_POOL[(Math.random() * ITEM_POOL.length) | 0];
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ITEMS[type].color).multiplyScalar(2.2) });
    const gem = new THREE.Mesh(this.pickGeo, mat), ring = new THREE.Mesh(this.ringGeo, mat);
    const beam = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: ITEMS[type].color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    beam.position.y = 22;
    const ring2 = new THREE.Mesh(this.ringGeo, mat); ring2.rotation.x = Math.PI / 2;
    const halo = new THREE.Mesh(this.haloGeo, beam.material);
    g.add(gem, ring, ring2, halo, beam);
    g.position.copy(pos);
    this.w.scene.add(g);
    const p = { pos: pos.clone(), type, g, gem, ring, ring2, halo, mat, beamMat: beam.material, active: true, t: 0, fixed: false };
    this.pickups.push(p);
    return p;
  }

  scatterPickups(n) { for (let i = 0; i < n; i++) this.addPickup(this.randomPoint(4, 16, 0.62)); }

  _retype(p) {
    p.type = ITEM_POOL[(Math.random() * ITEM_POOL.length) | 0];
    p.mat.color.setHex(ITEMS[p.type].color).multiplyScalar(2.2); p.beamMat.color.setHex(ITEMS[p.type].color);
  }

  // 막히지 않은 임의 지점 (지면 위 lo~hi m)
  randomPoint(lo = 6, hi = 28, frac = 0.7, cx = 0, cz = 0, rad = null) {
    const R = rad ?? this.w.size * frac, p = new THREE.Vector3();
    for (let i = 0; i < 40; i++) {
      p.set(cx + (Math.random() * 2 - 1) * R, 0, cz + (Math.random() * 2 - 1) * R);
      p.x = clamp(p.x, -this.w.size + 10, this.w.size - 10); p.z = clamp(p.z, -this.w.size + 10, this.w.size - 10);
      if (this.w.def.land && i < 36 && !this.w.def.land(p.x, p.z)) continue;   // 섬 맵: 틈(허공) 위는 고르지 않는다
      p.y = this.w.h(p.x, p.z) + lo + Math.random() * (hi - lo);
      if (p.y > this.w.ceiling - 8) p.y = this.w.ceiling - 8;
      if (!this.w.col.blocked(p, 3)) return p;
    }
    return p;
  }

  give(a, type) {
    const it = ITEMS[type];
    const L = a.isPlayer ? this.L : null;
    if (type === "repair") a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.5 * (L ? 1 + L.repair : 1));
    else if (type === "missiles") a.missiles = Math.min(8 + (L ? L.mCap : 0), a.missiles + 3);
    else if (a.isPlayer) { a.items.push(type); if (a.items.length === 1) a.sel = 0; }
    else this.useItem(a, type);
    if (a.isPlayer) { this.feel.pickColor = it.color; this.snd.play("pickup"); this.s.hud.toast(`${it.name} 획득${it.instant ? "" : this.touchUI() ? "" : a.items.length > 1 ? "  [E] 사용 · [Q] 교체" : "  [E] 사용"}`, "#" + it.color.toString(16).padStart(6, "0"), 1.3, 20); }
    if (this.h.onPickup) this.h.onPickup(a, type);
  }

  touchUI() { const g = this.s.game; return g.input.device === "touch" || !!(g.touchWanted && g.touchWanted()); }
  // 플레이어가 이 아이템을 집을 수 있는가 (보관 칸이 가득 차면 보관형은 못 집는다)
  canTake(a, type) { return !a.isPlayer || ITEMS[type].instant || a.items.length < ITEM_SLOTS; }
  // 쓸 아이템 바꾸기
  nextItem(a) {
    if (a.items.length < 2) return;
    a.sel = (a.sel + 1) % a.items.length; a.swapT = 0.35;
    this.snd.play("click");
  }

  useItem(a, type = a.items && a.items[a.sel]) {
    if (!type) return;
    const L = a.isPlayer ? this.L : null, dk = L ? 1 + L.itemDur : 1;
    if (a.isPlayer) {
      a.items.splice(a.sel, 1); a.sel = 0; a.swapT = 0.35; this.snd.play(type === "emp" ? "emp" : "item"); this.feel.emit("item", 1, type);
      GP.ev("item");
      const fx = L.fx.item;   // 아이템 사용 효과 (격납고)
      if (fx.color) { this.fx.ring(a.pos, fx.color, 9, 0.45); if (fx.burst) this.fx.burst(a.pos, fx.color, 24, 12, 0.6, 0.4, 0); }
    }
    if (type === "shield") { a.shield = SHIELD_HP * (L ? 1 + L.shieldK : 1); a.shieldT = 10 * dk; if (a.isPlayer) this.feel.emit("shieldUp"); }
    else if (type === "boost") a.boostT = 6 * (L ? dk + L.boostDur : 1);
    else if (type === "overcharge") a.overT = 10 * (L ? dk + L.overDur : 1);
    else if (type === "emp") {
      this.fx.flash(a.pos, 0x9fc0ff, 30, 0.5);
      this.fx.ring(a.pos, 0xb8d0ff, 45, 0.55);
      this.fx.burst(a.pos, 0xb8c8ff, 60, 40, 0.5, 0.4, 0);
      const er = 45 * (L ? 1 + L.emp : 1);
      for (const o of this.actors) if (this.hostile(a, o) && o.pos.distanceTo(a.pos) < er && o.kind !== "core" && o.kind !== "prop") {
        o.stunT = 3.5;
        if (o.isPlayer) { this.s.hud.toast("EMP 피격 — 조종 불능!", "#b8c8ff", 1.5, 24); this.feel.emit("stun"); }
        else this.fx.spark(o.pos, 0xb8c8ff, 10);
      }
      if (!a.isPlayer) this.snd.play("emp", this.volAt(a.pos), this.panAt(a.pos));
    }
  }

  // ── 무기 ──
  fireLaser(a, origin, dir, dmg, color, speed = LASER_SPEED) {
    a.shotN = (a.shotN || 0) + 1;                // 온라인: 사격 연출을 다른 사람에게 알리는 횟수
    this.shots.push({ pos: origin.clone(), dir: dir.clone(), speed, life: 0.85, dmg, owner: a, color, skl: this._sk > 0 });
  }

  fireMissile(a, origin, dir, target, dmg = 55, quiet = false) {
    const mesh = new THREE.Mesh(this.missileGeo, this.missileMat);
    // 불빛: 내가 쏜 것은 주황, 나를 노리는 것은 빨강
    if (a.isPlayer) dmg *= 1 + this.L.mDmg;
    const mcol = target && target.isPlayer ? 0xff2a2a : a.isPlayer ? this.L.fx.missile : this.hostile(a, this.player) ? 0xff5a3a : 0x5ab4ff;
    const glow = new THREE.Mesh(this.mGlowGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(mcol).multiplyScalar(2.4), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    glow.position.z = -0.9; mesh.add(glow); mesh.userData.glow = glow; mesh.userData.col = mcol;
    mesh.position.copy(origin);
    this.w.scene.add(mesh);
    // 유도하지 않는다: 쏘는 순간 표적이 갈 자리(예측 지점)를 향해 방향을 잡고, 그 궤도로 곧게 날아간다
    const fly = dir.clone().normalize();
    if (target && target.alive) { this._lead(origin, target, 62, _c).sub(origin); if (_c.lengthSq() > 1) fly.copy(_c.normalize()); }
    const v0 = 45 + Math.max(0, a.vel.dot(fly));
    this.missiles.push({ pos: origin.clone(), vel: fly.clone().multiplyScalar(v0), target, life: 5.5, owner: a, dmg, mesh, speed: v0, lost: 1, skl: this._sk > 0 });
    if (this.h.onMissile) this.h.onMissile(a, target);
    this.snd.play("missile", a.isPlayer ? (quiet ? 0.45 : 1) : this.volAt(origin), a.isPlayer ? 0 : this.panAt(origin), quiet ? 1.3 : 1);
    if (a.isPlayer && !quiet) this.feel.emit("missile");
    if (!a.isPlayer || this.s.player.camMode !== "fpv") this.fx.muzzle(origin, dir, 0xffb060, a.isPlayer ? 1.2 : 2);
    if (target && target.isPlayer) this.warn = 1.2;
  }

  // 사거리·각도 안에서 조준선에 가장 가까운 적
  _aimTarget(maxAng, maxDist) {
    const pl = this.s.player;
    let best = null, bestAng = maxAng;
    for (const o of this.actors) {
      if (!this.hostile(this.player, o) || !o.targetable) continue;
      _a.copy(o.pos).sub(pl.aimPos);
      const d = _a.length();
      if (d > maxDist || d < 1) continue;
      const ang = Math.acos(clamp(_a.dot(pl.aimDir) / d, -1, 1)) - Math.atan((o.radius * hb(o)) / d) * 0.5;
      if (ang < bestAng) { bestAng = ang; best = o; }
    }
    return best;
  }

  // 표적의 이동을 감안한 예상 위치
  _lead(from, target, speed, out) {
    const d = from.distanceTo(target.pos);
    return out.copy(target.pos).addScaledVector(target.vel, d / speed);
  }

  _playerWeapons(dt) {
    const p = this.player, pl = this.s.player, inp = this.s.game.input;
    this._dodge(dt, p, pl, inp);
    if (!p.alive || p.stunT > 0 || this.s.mode.state !== "run" || this.s.game.state === "pause") { this.lock = null; this.lockT = 0; this.aim = null; return; }
    const over = p.overT > 0;
    p.fireT -= dt; p.missileT -= dt;
    // 자동 사격: 조준선에 적이 걸리면 레이저, 락온되면 미사일을 알아서 쏜다 (조종에만 집중)
    const auto = settings.autoFire === "on" || inp.device === "touch" || (settings.autoFire !== "off" && inp.device === "gamepad");   // 터치는 늘 자동, 패드·조종기는 끄지 않았으면 자동
    const wantFire = inp.isHeld("fire") || (auto && !!this.aim && p.heat < 0.8);
    if (wantFire && p.fireT <= 0 && !p.overheated) {
      p.fireT = 0.105 / Math.max(0.4, 1 + this.L.rate);   // 레이저 포 부품: 연사 속도
      _d.copy(pl.aimDir);
      // 조준 보정: 조준선 근처의 적에게는 예상 위치로 살짝 끌어당김
      const t = this._aimTarget(0.075 * 1.1, this.aimRange);
      if (t && this._vis(pl.aimPos, t)) {
        this._lead(pl.aimPos, t, LASER_SPEED, _a).sub(pl.aimPos).normalize();
        _d.lerp(_a, 0.8).normalize();
      }
      p.side = -(p.side || 1);
      _x.set(1, 0, 0).applyQuaternion(pl.body.quat);
      _b.copy(pl.aimPos).addScaledVector(_x, p.side * 0.12).addScaledVector(_d, 0.5);
      const L = this.L, crit = L.crit && Math.random() < L.crit;
      const ldmg = (over ? 18 : 9) * Math.max(0.2, 1 + L.laserDmg);
      this.fireLaser(p, _b, _d, ldmg * (crit ? 2 + L.critK : 1), over ? 0xff4ad6 : crit ? 0xffffff : L.fx.laser);
      const sh = this.shots[this.shots.length - 1]; sh.wk = L.fx.beam.wk; sh.sk = L.fx.beam.spark * (crit ? 1.6 : 1);
      // 확산형 레이저: 좌우로 벌어지는 보조탄 (피해는 주탄의 일부, 열은 더 쌓이지 않는다)
      for (let i = 0; i < L.spread; i++) {
        const sd = i % 2 ? 1 : -1, ang = 0.035 * (1 + (i >> 1));
        _a.copy(_d).addScaledVector(_x, sd * ang).normalize();
        this.fireLaser(p, _c.copy(_b).addScaledVector(_x, sd * 0.14), _a, ldmg * (0.4 + L.spreadK), over ? 0xff4ad6 : L.fx.laser);
        const s2 = this.shots[this.shots.length - 1]; s2.wk = L.fx.beam.wk * 0.7; s2.sk = L.fx.beam.spark * 0.7;
      }
      this.snd.play("laser", 1, p.side * 0.3, over ? 0.8 : 1);
      this.feel.emit("fire", over ? 1.5 : 1, p.side);
      if (pl.camMode !== "fpv") this.fx.muzzle(_b, _d, over ? 0xff4ad6 : L.fx.laser, 0.9);   // FPV 에서는 화면 모서리 섬광으로 대신한다
      if (!over) { p.heat += 0.055 * Math.max(0.3, 1 + L.heat); if (p.heat >= 1) { p.overheated = true; this.s.hud.toast("과열!", "#ff6b5a", 0.8, 22); this.feel.emit("overheat"); } }
    } else if (p.overheated && inp.isHeld("fire")) {
      // 과열 중 방아쇠: 헛도는 소리
      if ((p.dryT = (p.dryT || 0) - dt) <= 0) { p.dryT = 0.3; this.feel.emit("dry"); }
    }
    // 조준선에 걸린 적 (HUD 색·조준 효과용)
    const on = this._aimTarget(0.06 * 1.1, this.aimRange);
    this.aim = on && this._vis(pl.aimPos, on) ? on : null;
    // 락온
    const cand = this._aimTarget(0.17 * 1.15, this.lockRange);
    if (cand && cand === this.lock && this._vis(pl.aimPos, cand)) {
      const was = this.lockT < 0.7;
      this.lockT += dt;
      if (was && this.lockT >= this.lockNeed) this.snd.play("lock");
    } else { this.lock = cand; this.lockT = 0; }
    const autoMissile = auto && this.lockT >= this.lockNeed + 0.2 && p.missiles > 0 && p.missileT <= 0;
    if (inp.take("missile") || autoMissile) {
      if (p.missiles > 0 && p.missileT <= 0) {
        p.missiles--; p.missileT = autoMissile ? 2.5 : 0.7;
        _b.copy(pl.aimPos).addScaledVector(pl.aimDir, 0.6);
        this.fireMissile(p, _b, pl.aimDir, this.lockT >= this.lockNeed ? this.lock : null);
      } else if (p.missiles <= 0) this.feel.emit("dry");
    }
    if (inp.take("itemNext")) this.nextItem(p);
    if (inp.take("item") && p.items.length) this.useItem(p);
    if (p.swapT > 0) p.swapT -= dt;
    this._itemButtons(p);
  }

  // ── 고속 회피: 충전 2회, 하나씩 다시 찬다. 쓰는 동안 잠깐 무적 + 노리던 미사일이 표적을 놓친다 ──
  _dodge(dt, p, pl, inp) {
    if (p.dodgeN === undefined) { p.dodgeN = DODGE.max; p.dodgeC = 0; p.dodgeT = 0; }
    if (p.dodgeT > 0) p.dodgeT -= dt;
    const tb = this._dodgeBtn || (this._dodgeBtn = document.querySelector("#touch .b-dodge"));
    if (tb) { const lab = `회피 ${"◆".repeat(p.dodgeN)}${"◇".repeat(DODGE.max - p.dodgeN)}`; if (tb.textContent !== lab) tb.textContent = lab; tb.disabled = p.dodgeN <= 0; }
    if (p.dodgeN < DODGE.max) { p.dodgeC += dt; if (p.dodgeC >= DODGE.cool) { p.dodgeC = 0; p.dodgeN++; this.snd.play("shieldup", 0.35); } } else p.dodgeC = 0;
    if (!inp.take("dodge")) return;
    if (!p.alive || p.stunT > 0 || this.s.mode.state !== "run") return;
    if (p.dodgeN <= 0) { this.feel.emit("dry"); return; }
    p.dodgeN--; p.dodgeT = DODGE.iframe;
    const b = pl.body, c = inp.ctl;
    // 방향: 롤(좌우) 입력 쪽으로 옆 이동, 피치를 당기면 위로, 입력이 없으면 앞으로 돌진
    _d.set(0, 0, -1).applyQuaternion(b.quat); _d.y = 0; if (_d.lengthSq() < 1e-4) _d.set(0, 0, -1); _d.normalize();
    _b.set(-_d.z, 0, _d.x);   // 오른쪽
    const sx = Math.abs(c.roll) > 0.2 ? Math.sign(c.roll) : 0, up = c.pitch < -0.5 ? 1 : 0;
    const dir = new THREE.Vector3();
    if (sx) dir.addScaledVector(_b, sx); if (up) dir.y += 1; if (!sx && !up) dir.copy(_d);
    dir.normalize();
    b.vel.addScaledVector(dir, DODGE.push);
    // 나를 노리던 가까운 미사일은 표적을 잃는다
    for (const m of this.missiles) if (m.target === p) { m.target = null; m.lost = 1; m.dodged = p; }
    this.snd.play("whoosh", 1); this.snd.play("boost", 0.6);
    this.fx.ring(p.pos, 0x7fe6ff, 4, 0.35);
    this.feel.emit("item", 1, "dodge");
  }

  // 몸체 충돌 상자의 주인 → 실제로 피해를 받을 액터 (부위가 이미 부서졌으면 본체로)
  _bodyTarget(o) {
    if (o.alive && o.targetable) return o;
    const r = o.unit && o.unit.root;
    return r && r !== o && r.alive && r.targetable ? r : null;
  }
  // a 에서 대상 t 가 보이는지. 대상이 대형 유닛이면 그 유닛 자신의 몸체에는 가리지 않는다
  _vis(a, t, step = 1.2) {
    // 표적 자신의 충돌체(코어·지휘소의 구체, 포탑 몸체 등)는 시야 판정에서 뺀다 — 중심점이 자기 몸 안에 있어 '가려짐'으로 잡히던 문제
    const L = t.colliders || [t.collider, t.collider2], prev = [];
    for (const c of L) if (c) { prev.push(c.off); c.off = true; }
    try { return this.w.col.visible(a, t.pos, step, t.unit || null); } finally { let i = 0; for (const c of L) if (c) c.off = prev[i++]; }
  }

  // 명중 지점에 떠오르는 피해 숫자 (가까운 연속 명중은 한 숫자로 합쳐 커진다)
  _pop(pos, amt, kind) {
    const L = this.pops || (this.pops = []);
    for (const q of L) if (q.kind === kind && q.t < 0.35 && q.pos.distanceToSquared(pos) < 36) { q.amt += amt; q.t = Math.min(q.t, 0.08); q.pos.lerp(pos, 0.3); q.bump = 1; return; }
    if (L.length > 14) L.shift();
    L.push({ pos: pos.clone(), amt, kind, t: 0, bump: 1, dx: (Math.random() - 0.5) * 0.9 });
  }
  // 맞은 드론이 움찔: 모델이 잠깐 부풀었다 돌아온다 (모델 재질은 공유라 색 대신 크기로)
  _pulse(a) {
    if (!a.model || a.kind !== "bot") return;
    const ud = a.model.userData;
    if (ud.bs === undefined) ud.bs = a.model.scale.x;
    ud.pulse = 1;
  }

  // ── 피해 ──
  damage(a, amount, attacker, point) {
    if (!a.alive || a.invulnerable || amount <= 0 || this.frozen) return;
    if (this._sk > 0 && attacker && attacker.isPlayer) amount *= this.skillK;   // 스킬 피해 배율 (PvP)
    if (a.remote) return this._remoteHit(a, amount, attacker, point);           // 다른 사람의 기체·호스트 소유 오브젝트: 맞은 쪽에 보고
    if (a.isPlayer && (a.dodgeT > 0 || this.s.time < (a.spawnGodT || 0))) return;   // 고속 회피 중 · 리스폰 직후 3초는 맞지 않는다
    if (a.armor) amount *= a.armor;
    if (a.isPlayer) a.hurtAt = this.s.time;
    if (attacker && attacker.isPlayer && this.missiles && amount > 0 && this._mHit) { GP.ev("missileHit"); this._mHit = false; }
    if (attacker && attacker.kind !== "player" && a.isPlayer && !this._net && !attacker.remote) amount *= this.diff.dmg;
    if (a.isPlayer && this.L.guard) amount *= Math.max(0.4, 1 + this.L.guard);     // 장갑·실드 부품: 받는 피해 감소
    if (a.isPlayer && this.skill) amount *= this.skill.dmgMul;                    // 오버드라이브: 받는 피해 절반
    if (this.skill && attacker && attacker.isPlayer && this.skill.active && this.hostile(attacker, a)) this.skill.onHit(a, amount, point);   // 스킬 중 명중 연출
    if (this.skill && attacker && attacker.isPlayer && this.hostile(attacker, a)) this.skill.gain(Math.min(amount, a.hp + (a.shield || 0)) * (a.kind === "core" ? 0.05 : 0.14));   // 스킬 게이지: 준 피해
    const src = attacker && attacker !== a ? attacker.pos : point || null;   // 피해가 온 곳 (효과 방향용)
    if (a.shield > 0) {
      const s = Math.min(a.shield, amount); a.shield -= s; amount -= s;
      if (a.isPlayer) {
        this.snd.play("shield", clamp(s / 15, 0.4, 1), src ? this.panAt(src) * 0.7 : 0);
        this.feel.emit("shield", s, src);
        if (a.shield <= 0) { this.feel.emit("shieldBreak"); this.fx.ring(a.pos, 0x7fe6ff, 3, 0.4); }
      } else if (attacker && attacker.isPlayer) { this.hitMark = HIT_T; this.hitKind = "shield"; this.hitAmt = s; this.feel.emit("hit", s, a); this.fx.spark(point || a.pos, 0x7fe6ff, 8); this._pop(point || a.pos, s, "shield"); }
    }
    if (amount <= 0) return;
    a.hp -= amount;
    a.flash = 0.12;
    if (a.ai && attacker) { a.ai.lastHit = attacker; a.ai.lastHitT = 4; }
    if (a.isPlayer) {
      this.hurtT = 0.5;
      if (attacker) this.hurtDir.copy(attacker.pos); else if (point) this.hurtDir.copy(point);
      this.hurtAmt = amount;
      if (src) this._hurtDir(src, amount);
      this.snd.play("hurt", clamp(amount / 20, 0.3, 1), src ? this.panAt(src) * 0.7 : 0);
      this.feel.emit("hurt", amount, src);
    } else if (attacker && attacker.isPlayer) { this.hitMark = HIT_T; this.hitKind = "hp"; this.hitAmt = amount; this.feel.emit("hit", amount, a); this._pop(point || a.pos, amount, a.hp - amount <= 0 ? "kill" : a.armor && a.armor < 0.9 ? "armor" : "hp"); this._pulse(a); }   // 명중 확인음은 feel 이 낸다(연속 명중 시 음 상승)
    if (this.h.onDamage) this.h.onDamage(a, amount, attacker);
    if (a.hp <= 0) this.kill(a, attacker);
  }

  // 대리 액터(원격 플레이어·호스트 소유 오브젝트) 명중: 체력은 건드리지 않고 보고만 (맞은 쪽이 적용)
  _remoteHit(a, amount, attacker, point) {
    if (a.god || !attacker || attacker.remote || !this.h.onRemoteHit) return;
    if (!this.h.onRemoteHit(a, amount, attacker)) return;
    a.flash = 0.12;
    if (!attacker.isPlayer) return;
    if (this.skill && this.skill.active) this.skill.onHit(a, amount, point);
    if (this.skill) this.skill.gain(Math.min(amount, a.hp + (a.shield || 0)) * 0.14);
    const sh = a.shield > 0;
    this.hitMark = HIT_T; this.hitKind = sh ? "shield" : "hp"; this.hitAmt = amount;
    this.feel.emit("hit", amount, a);
    this._pop(point || a.pos, amount, sh ? "shield" : a.hp - amount <= 0 ? "kill" : "hp");
  }

  // 피격 방향 표시 추가: 같은 쪽(가까운 위치)에서 연달아 맞으면 하나로 합쳐 더 진하게
  _hurtDir(src, amount) {
    const p = this.player;
    for (const h of this.hurts) {
      if (h.pos.distanceToSquared(src) < 36 || (p && _p1.copy(h.pos).sub(p.pos).normalize().dot(_p2.copy(src).sub(p.pos).normalize()) > 0.94)) {
        h.pos.copy(src); h.t = 1; h.amt = Math.min(80, h.amt * 0.5 + amount); return;
      }
    }
    if (this.hurts.length >= 4) this.hurts.shift();
    this.hurts.push({ pos: src.clone(), t: 1, amt: amount });
  }

  kill(a, killer) {
    if (!a.alive) return;
    a.alive = false; a.hp = 0; a.deaths++;
    if (killer && killer !== a) killer.kills++;
    if (a.bossBar) this.bossDown = (this.bossDown || 0) + 1;   // 스토리 목표: 보스·중간 보스 격파
    if (killer && killer.isPlayer && killer !== a && (this.ffa || killer.team !== a.team)) {
      if (a.kind === "bot") GP.ev("kill");
      if (a.kind === "turret" || (a.unit && a === a.unit.root)) GP.ev("turret");
      if (a.bossBar || a.botKind === "boss" || a.botKind === "gunship") GP.ev("boss");
    }
    const big = a.kind === "core" || a.botKind === "boss" ? 4 : a.kind === "turret" || a.botKind === "gunship" ? 2 : 1;
    this.fx.destroy(a.pos, a.isPlayer ? 1.4 : big);
    this.snd.play("explode", a.isPlayer ? 1 : this.volAt(a.pos) * (0.6 + big * 0.2), a.isPlayer ? 0 : this.panAt(a.pos));
    if (a.isPlayer) {
      const pl = this.s.player;
      pl.crash(); pl.broken = true; pl.model.visible = false;
      pl.body.vel.multiplyScalar(0.3);
      a.respawnT = RESPAWN_ME;   // 내 기체는 3초 뒤 재출격
      this.feel.emit("death");
      if (this.skill) this.skill.onPlayerDeath();
    } else {
      if (a.model) a.model.visible = false;
      if (a.collider) a.collider.off = true;
      if (a.collider2) a.collider2.off = true;
      if (a.respawns) a.respawnT = RESPAWN;
      this._blast(a.pos, big);
      if (killer && killer.isPlayer) { this._myKill(a, a.bossBar ? 4 : big); if (this.skill) { this.skill.onKill(a); this.skill.gain(a.bossBar ? 35 : big >= 4 ? 30 : big >= 2 ? 16 : 9); } }   // 스킬 게이지: 격추
    }
    if (this.h.onKill) this.h.onKill(a, killer);
  }

  // 내가 격파: 큰 폭발·잔해, 짧은 히트스톱(보스는 슬로모션), 조준선 격파 표시와 연속 격파
  _myKill(a, big) {
    const t = this.s.time;
    this.killStreak = t - this.killAt < 4 ? this.killStreak + 1 : 1;
    this.killAt = t;
    this.killMark = big >= 4 ? 1.6 : 1.1; this.killName = a.name || "표적"; this.killBig = big;
    this.fx.explosion(a.pos, big * 0.45 + 0.35);                               // 내 격파는 한 겹 더 크게
    this.fx.debrisBurst(a.pos, a.color || (a.rk && a.rk.color) || 0x8a93a6, 6 + big * 5, 9 + big * 3, 0.22 + Math.min(1.2, (a.radius || 1) * 0.18));
    this.fx.ring(a.pos, big >= 4 ? 0xffe0a0 : 0xffd27a, (a.radius || 1) * 3 + 5 * big, 0.55);
    if (big >= 4) this.s.slowMo(1.1, 0.22, 0.4);
    else if (big >= 2) this.s.slowMo(0.16, 0.08, 0.6);
    else this.s.slowMo(0.075, 0.06, 0.7);
    this.feel.emit("kill", big, a);
  }

  _respawn(a) {
    const sp = this.h.spawnPoint ? this.h.spawnPoint(a) : null;
    const pos = sp ? sp.pos : this.randomPoint(8, 24);
    a.alive = true; a.hp = a.maxHp; a.shield = 0; a.heat = 0; a.overheated = false; a.stunT = 0; a.boostT = 0; a.overT = 0;
    if (a.isPlayer) {
      a.missiles = Math.max(a.missiles, 3 + this.L.mStart); a.shield = 40 + this.L.spawnShield; a.shieldT = 3 + (this.L.spawnShield ? 2 : 0);
      this.s.player.respawn(pos, sp ? sp.yaw || 0 : Math.atan2(pos.x, pos.z));
      a.spawnGodT = this.s.time + SPAWN_GOD; this.s.hud.toast(`리스폰 보호 ${SPAWN_GOD}초`, "#7fe6ff", 1.4, 20);
    } else {
      a.pos.copy(pos); a.vel.set(0, 0, 0); a.missiles = a.K.missiles;
      if (a.model) a.model.visible = true;
      a.ai.target = null;
    }
  }

  // 반경 피해(미사일·자폭)
  splash(pos, radius, dmg, owner, direct) {
    for (const o of this.actors) {
      if (!o.alive || o === direct) continue;
      if (owner && !this.hostile(owner, o) && o !== owner) continue;
      const d = o.pos.distanceTo(pos) - o.radius;
      if (d < radius) this.damage(o, dmg * (1 - Math.max(0, d) / radius) * (o === owner ? 0.5 : 1), owner, pos);
    }
  }

  // ── 매 프레임 ──
  update(dt) {
    const pl = this.s.player, p = this.player;
    this._playerWeapons(dt);
    if (p) { if (!this.skill) this.skill = new SkillSys(this); this.skill.update(dt); }
    this.units.update(dt);

    // 플레이어 상태 반영
    if (p) {
      p.heat = Math.max(0, p.heat - dt * 0.42 * Math.max(0.3, 1 + this.L.cool));
      if (p.overheated && p.heat < 0.45) { p.overheated = false; this.feel.emit("cool"); }
      pl.body.boost = (p.boostT > 0 ? 1.6 * (1 + this.L.boost) : 1) * (1 + this.L.thrust) * (this.skill ? this.skill.boostMul : 1);
      // 부스트 효과 (격납고)
      const bf = this.L.fx.boost;
      if (p.alive && p.boostT > 0 && (bf.color || bf.rainbow) && (this._bt = (this._bt || 0) - dt) <= 0) {
        this._bt = 0.035;
        const c = bf.rainbow ? new THREE.Color().setHSL((this.s.time * 0.7) % 1, 1, 0.6).getHex() : bf.color;
        this.fx.puff(pl.body.pos, c, 0.35, 0.6, 0.25);
      }
      // 재생 (장갑·배터리 단계 효과): 4초 동안 맞지 않으면
      if (this.L.regen && p.alive && p.hp < p.maxHp && this.s.time - (p.hurtAt || -99) > 4) p.hp = Math.min(p.maxHp, p.hp + this.L.regen * dt);
      if (p.alive) pl.body.disabled = p.stunT > 0 || pl.crashed;
      this.shieldMesh.visible = p.alive && p.shield > 0;
    }

    for (const a of this.actors) {
      if (a.flash > 0) a.flash -= dt;
      if (a.model && a.model.userData.pulse > 0) { const ud = a.model.userData; ud.pulse = Math.max(0, ud.pulse - dt * 9); a.model.scale.setScalar(ud.bs * (1 + 0.12 * ud.pulse * ud.pulse)); }
      if (a.stunT > 0) a.stunT -= dt;
      if (a.boostT > 0) a.boostT -= dt;
      if (a.overT > 0) a.overT -= dt;
      if (a.shieldT > 0) { a.shieldT -= dt; if (a.shieldT <= 0) { if (a.isPlayer && a.shield > 0 && a.alive) this.feel.emit("shieldDown"); a.shield = 0; } }
      if (!a.alive) {
        if (a.respawns && (a.respawnT -= dt) <= 0) this._respawn(a);
        continue;
      }
      // 크게 손상된 기체·포탑은 연기를 뿜는다 (1인칭에서는 내 연기가 시야를 가리므로 생략)
      if (a.hp < a.maxHp * 0.4 && (a.kind === "bot" || a.kind === "turret" || a.isPlayer) && (a.smokeT = (a.smokeT || 0) - dt) <= 0) {
        const f = a.hp / (a.maxHp * 0.4);
        a.smokeT = 0.05 + f * 0.16;
        if ((!a.isPlayer || pl.camMode !== "fpv") && a.pos.distanceToSquared(this.s.camera.position) < 62500) {
          this.fx.smoke(a.pos, 0.75 * a.radius, 1.3, 0.13, a.radius * 0.5);
          if (f < 0.45 && Math.random() < 0.25) this.fx.spark(a.pos, 0xff9a3a, 2);
        }
      }
      if (a.kind === "bot") this._bot(a, dt);
      else if (a.kind === "turret") { if (a.targetable) this._turret(a, dt); }   // 숨겨진(미발견) 포탑은 잠들어 있다
      else if (a.kind === "core") { a.orb.rotation.y += dt * 0.8; a.rings[0].rotation.x += dt * 0.9; a.rings[1].rotation.y += dt * 0.7; a.rings[1].rotation.x = 1.2; }
    }

    this._shots(dt);
    this._missiles(dt);
    this._pickups(dt);
    if (this.hurtT > 0) this.hurtT -= dt;
    for (let i = this.hurts.length - 1; i >= 0; i--) if ((this.hurts[i].t -= dt / 1.4) <= 0) this.hurts.splice(i, 1);
    if (this.hitMark > 0) this.hitMark -= dt;
    if (this.pops) for (let i = this.pops.length - 1; i >= 0; i--) { const q = this.pops[i]; q.t += dt; q.bump = Math.max(0, q.bump - dt * 7); if (q.t > 0.9) this.pops.splice(i, 1); }
    if (this.killMark > 0) this.killMark -= dt;
    if (this.warn > 0) {
      this.warn -= dt;
      // 미사일이 가까울수록 경보가 빨라진다
      if ((this._warnBeep = (this._warnBeep || 0) - dt) <= 0) { this._warnBeep = clamp(this.warnDist / 110, 0.22, 0.5); this.snd.play("warn"); }
    } else this._warnBeep = 0;
  }

  _shots(dt) {
    const fx = this.fx, col = this.w.col, me = this.player;
    fx.beginBolts();
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const len = s.speed * dt;
      // 액터 명중 검사 (선분-구)
      let bestT = len + 1, victim = null;
      for (const o of this.actors) {
        if (!o.alive || o === s.owner || !o.targetable || !this.hostile(s.owner, o)) continue;
        _a.copy(o.pos).sub(s.pos);
        const t = _a.dot(s.dir);
        const r = s.owner.isPlayer ? (o.radius + 0.35) * hb(o) : o.radius;
        if (t < -r || t > len + r) continue;
        const perp2 = _a.lengthSq() - t * t;
        if (perp2 > r * r) continue;
        const th = Math.max(0, t - Math.sqrt(r * r - perp2));
        if (th < bestT) { bestT = th; victim = o; }
      }
      // 지형·구조물 (쏜 쪽 유닛 자신의 몸체는 통과)
      let wall = -1, body = null;
      col.skip = s.owner.unit || null;
      for (let d = 0.7; d <= len; d += 0.7) { _b.copy(s.pos).addScaledVector(s.dir, d); const hc = col.hitBy(_b, 0.03); if (hc) { wall = d; body = hc.owner || null; break; } }
      col.skip = null;
      // 대형 유닛의 몸체(선체·차체·몸통)에 맞음 → 그 몸체 액터가 피해를 받는다
      if (body && !(victim && bestT <= wall)) {
        const tgt = this._bodyTarget(body);
        if (tgt && this.hostile(s.owner, tgt)) {
          fx.hitSpark(_b, s.dir, s.color, s.owner.isPlayer ? Math.round(8 * (s.sk || 1)) : 5, true);
          this._sk += s.skl ? 1 : 0; try { this.damage(tgt, s.dmg, s.owner, _b); } finally { this._sk -= s.skl ? 1 : 0; }
          this.shots.splice(i, 1); continue;
        }
      }
      if (victim && (wall < 0 || bestT <= wall)) {
        _b.copy(s.pos).addScaledVector(s.dir, bestT);
        fx.hitSpark(_b, s.dir, s.color, s.owner.isPlayer ? Math.round(13 * (s.sk || 1)) : 5, victim.radius > 1.5 || s.owner.isPlayer);
        if (s.owner.isPlayer) fx.hitSpark(_b, s.dir, 0xffffff, 4, false, false);   // 흰 불똥을 덧대 명중 지점이 또렷하게
        this._sk += s.skl ? 1 : 0; try { this.damage(victim, s.dmg, s.owner, _b); } finally { this._sk -= s.skl ? 1 : 0; }
        this.shots.splice(i, 1); continue;
      }
      if (wall >= 0) { fx.hitSpark(_b, s.dir, 0xffd27a, 4, false, false); this.shots.splice(i, 1); continue; }
      // 적탄이 나를 아슬아슬하게 스쳐 지나감
      if (!s.zip && me && me.alive && s.owner !== me && this.hostile(s.owner, me)) {
        _a.copy(me.pos).sub(s.pos);
        const t = _a.dot(s.dir);
        if (t > 0 && t <= len && _a.lengthSq() - t * t < 10) {
          s.zip = true;
          _c.copy(s.pos).addScaledVector(s.dir, t);
          this.snd.play("zip", 0.8, this.panAt(_c));
          this.feel.emit("zip");
        }
      }
      s.pos.addScaledVector(s.dir, len);
      s.life -= dt;
      if (s.life <= 0) { this.shots.splice(i, 1); continue; }
      // 굵은 머리 + 길게 끌리는 꼬리. 가까이서는 가늘게(화면을 덮지 않게), 멀수록 굵게(멀리서도 보이게)
      const cd = s.pos.distanceTo(this.s.camera.position), mine = s.owner.isPlayer;
      const wd = (mine ? 0.17 : 0.26) * (s.wk || 1) * clamp(cd / 12, 0.25, 1) * clamp(cd / 30, 1, 3.4);   // 가늘지만 멀어질수록 굵혀 화면에서는 늘 2~3픽셀 이상
      s.far = (s.far || 0) + len;   // 날아간 거리: 총구 근처에서는 꼬리를 그리지 않아 화면을 가리지 않는다
      if (s.far > 11) fx.bolt(_b.copy(s.pos).addScaledVector(s.dir, -5), s.dir, 10, s.color, wd);
      else fx.bolt(_b.copy(s.pos).addScaledVector(s.dir, -s.far * 0.45), s.dir, s.far * 0.9, s.color, wd);
      if (s.far > 30) fx.bolt(_b.copy(s.pos).addScaledVector(s.dir, -19), s.dir, 18, s.color, wd * 0.45);
      if (!mine && (s.pt = (s.pt || 0) + 1) % 3 === 0) fx.puff(s.pos, s.color, 0.32 * clamp(cd / 30, 0.4, 1.6), 0.2, 0.05);   // 적 탄 머리의 빛 뭉치
    }
    fx.endBolts();
  }

  _missiles(dt) {
    let wd = 999;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.life -= dt;
      const atMe = m.target && m.target.isPlayer;
      m.speed = Math.min(atMe ? 58 : 80, m.speed + (atMe ? 22 : 36) * dt);
      _a.copy(m.vel).normalize();
      const t = m.target;
      if (t && t.alive && t.isPlayer && m.target) {   // 나를 향해 오는 미사일: 경고만 (유도는 없음)
        const d = m.pos.distanceTo(t.pos);
        if (_b.copy(t.pos).sub(m.pos).dot(_a) > 0) { this.warn = Math.max(this.warn, 0.3); if (d < wd) wd = d; }
      }
      if (t && t.alive && m.lost < 0.35) {
        this._lead(m.pos, t, m.speed, _b).sub(m.pos);
        const d = _b.length();
        _b.multiplyScalar(1 / Math.max(d, 1e-3));
        if (_a.dot(_b) < 0.15) m.lost += dt; else m.lost = 0;
        // 선회율 제한
        const ang = Math.acos(clamp(_a.dot(_b), -1, 1)), maxTurn = (atMe ? 1.5 : 2.3) * dt;
        if (ang > 1e-4) _a.lerp(_b, Math.min(1, maxTurn / ang)).normalize();
        if (t.isPlayer) { this.warn = Math.max(this.warn, 0.3); if (d < wd) wd = d; }
      }
      m.vel.copy(_a).multiplyScalar(m.speed);
      m.pos.addScaledVector(m.vel, dt);
      m.mesh.position.copy(m.pos);
      m.mesh.quaternion.setFromUnitVectors(_z.set(0, 0, 1), _a);
      m.mesh.userData.glow.scale.setScalar(1 + Math.sin(this.s.time * 40 + i) * 0.25);
      this.fx.puff(m.pos, m.mesh.userData.col, 0.75, 0.6, 0.2);
      this.fx.puff(m.pos, 0xffffff, 0.35, 0.25, 0.1);
      if ((m.sm = (m.sm || 0) + 1) % 2 === 0) this.fx.smoke(m.pos, 0.9, 1.6, 0.34, 0.3);
      this.w.col.skip = (m.owner && m.owner.unit) || null;
      const hc = this.w.col.hitBy(m.pos, 0.12);
      this.w.col.skip = null;
      let boom = m.life <= 0 || !!hc, direct = null;
      for (const o of this.actors) {
        if (!o.alive || !o.targetable || !this.hostile(m.owner, o) || o === m.dodged) continue;
        if (o.pos.distanceTo(m.pos) < (m.owner.isPlayer ? o.radius * hb(o) : o.radius) + 1.6) { boom = true; direct = o; break; }
      }
      if (!direct && hc && hc.owner) { const tgt = this._bodyTarget(hc.owner); if (tgt && this.hostile(m.owner, tgt)) direct = tgt; }   // 선체·몸통에 직격
      if (boom) {
        this.fx.explosion(m.pos, 1.3);
        this.snd.play("explode", this.volAt(m.pos) * 0.8, this.panAt(m.pos));
        this._blast(m.pos, 1.3);
        if (direct && m.owner && m.owner.isPlayer && (this.ffa || m.owner.team !== direct.team)) this._mHit = true;
        this._sk += m.skl ? 1 : 0;
        try { if (direct) this.damage(direct, m.dmg, m.owner, m.pos); this.splash(m.pos, m.owner && m.owner.isPlayer ? 8 : 7, m.dmg * 0.5, m.owner, direct); } finally { this._sk -= m.skl ? 1 : 0; }
        this.w.scene.remove(m.mesh); m.mesh.userData.glow.material.dispose();
        this.missiles.splice(i, 1);
      }
    }
    this.warnDist = wd;
  }

  _pickups(dt) {
    for (const p of this.pickups) {
      if (!p.active) {
        p.t -= dt;
        if (p.t <= 0) { p.active = true; p.g.visible = true; if (!p.fixed) { this._retype(p); p.pos.copy(this.randomPoint(4, 16, 0.62)); p.g.position.copy(p.pos); } }
        continue;
      }
      if (!p.fixed && (p.life = (p.life ?? 25 + Math.random() * 25) - dt) <= 0) {
        // 한동안 아무도 안 먹으면 빛 기둥과 함께 다른 곳으로 옮겨 간다
        this.fx.ring(p.pos, ITEMS[p.type].color, 3, 0.4);
        this._retype(p); p.pos.copy(this.randomPoint(4, 16, 0.62)); p.g.position.copy(p.pos); p.life = 25 + Math.random() * 25;
        this.fx.ring(p.pos, ITEMS[p.type].color, 3, 0.5);
      }
      p.gem.rotation.y += dt * 2; p.ring.rotation.x += dt * 1.3; p.ring.rotation.y += dt * 0.7; p.ring2.rotation.z += dt * 1.1;
      const pul = 1 + Math.sin(this.s.time * 4 + p.pos.x) * 0.14;
      p.gem.scale.setScalar(pul); p.halo.scale.setScalar(0.9 + (pul - 1) * 1.6); p.gem.position.y = Math.sin(this.s.time * 2 + p.pos.z) * 0.35;
      for (const a of this.actors) {
        if (!a.alive || a.static || (a.kind !== "player" && a.kind !== "bot")) continue;
        if (a.botKind === "boss" || a.botKind === "kamikaze") continue;
        if (a.pos.distanceTo(p.pos) < 3.1 + a.radius) {
          if (!this.canTake(a, p.type)) {
            if (!(this.fullT > this.s.time)) { this.fullT = this.s.time + 2.5; this.s.hud.toast("아이템 칸이 가득 찼습니다 — 먼저 사용하세요", "#ffb02e", 1.4, 18); this.feel.emit("dry"); }
            continue;
          }
          this.give(a, p.type);
          p.active = false; p.g.visible = false; p.t = 9 + Math.random() * 14;
          break;
        }
      }
    }
  }

  // ── AI 드론 ──
  _think(a) {
    const ai = a.ai;
    ai.think = 0.22 + Math.random() * 0.16;
    if (ai.lastHitT > 0) ai.lastHitT -= 0.3; else ai.lastHit = null;
    // 표적 선정: 가까운 적 우선, 목표물(focus)·방금 나를 쏜 적에 가중
    let best = null, bs = 1e9;
    for (const o of this.actors) {
      if (!this.hostile(a, o) || !o.targetable) continue;
      let d = a.pos.distanceTo(o.pos);
      if (d > 260 && o.kind !== ai.focus) continue;
      if (ai.focus && (o.kind === ai.focus || o.tag === ai.focus)) d *= 0.35;
      if (o === ai.lastHit) d *= 0.5;
      if (o.flagship) d *= 4;   // 하늘 높이 뜬 기함(fleet.js)은 가까운 다른 표적이 없을 때만 노린다
      if (o.kind === "turret" && ai.focus !== "turret") d *= 1.6;
      if (d < bs) { bs = d; best = o; }
    }
    ai.target = best;
    ai.los = best ? this._vis(a.pos, best, 1.5) : false;
    ai.goal = null;
    // 체력이 낮으면 수리 키트를 찾는다
    if (a.hp < a.maxHp * 0.4 && a.botKind !== "kamikaze" && a.botKind !== "boss") {
      let bp = null, bd = 130;
      for (const p of this.pickups) if (p.active && p.type === "repair") { const d = p.pos.distanceTo(a.pos); if (d < bd) { bd = d; bp = p; } }
      if (bp) ai.goal = bp.pos;
    }
    if (!ai.goal && !best) {
      if (ai.leader && ai.leader.alive) ai.goal = null; // 편대 비행은 _bot 에서 처리
      else if (!ai.roam || ai.roam.distanceTo(a.pos) < 12 || Math.random() < 0.03) ai.roam = ai.home ? this.randomPoint(8, 22, 0, ai.home.x, ai.home.z, 50) : this.randomPoint(8, 26);
    }
    if (this.h.botGoal) { const g = this.h.botGoal(a); if (g) ai.goal = g; }
  }

  _bot(a, dt) {
    const ai = a.ai, K = a.K, w = this.w, col = w.col, BR = a.bodyR || a.radius;
    if (a.stunT > 0) { // EMP: 조종 불능, 서서히 떨어짐
      a.vel.y -= 5 * dt; a.vel.multiplyScalar(1 - dt * 0.8);
      a.pos.addScaledVector(a.vel, dt);
      const gy = w.h(a.pos.x, a.pos.z) + BR; if (a.pos.y < gy) { a.pos.y = gy; a.vel.y = 0; }
      if (col.querySphere(a.pos, BR, _hit)) a.pos.addScaledVector(_hit.normal, _hit.depth);
      a.model.position.copy(a.pos); a.model.rotation.z += dt * 3; a.model.userData.tick(dt, 0, this.s.time);
      return;
    }
    if ((ai.think -= dt) <= 0) this._think(a);
    const speed = K.speed * (0.75 + ai.skill * 0.3) * (a.boostT > 0 ? 1.35 : 1);
    const t = ai.target;
    let face = null;
    _des.set(0, 0, 0);

    if (ai.goal) {
      _des.copy(ai.goal).sub(a.pos); const d = _des.length(); _des.multiplyScalar(speed / Math.max(d, 1));
    } else if (t) {
      _a.copy(t.pos).sub(a.pos);
      const d = _a.length();
      face = t;
      if (K.boom) { // 자폭 드론: 예상 위치로 돌진
        this._lead(a.pos, t, speed, _b).sub(a.pos).normalize();
        _des.copy(_b).multiplyScalar(speed);
        if (d < a.radius + t.radius + 1.6) { this.splash(a.pos, 7, K.boom, a, null); this.kill(a, null); return; }
      } else {
        _a.multiplyScalar(1 / Math.max(d, 1e-3));
        const R = ai.range + (t.static ? 12 : 0);
        _c.crossVectors(_a, UP).normalize().multiplyScalar(ai.orbit);
        if (d > R + 10 || !ai.los) _des.copy(_a).multiplyScalar(speed).addScaledVector(_c, speed * 0.25);
        else if (d < R - 8) _des.copy(_a).multiplyScalar(-speed * 0.7).addScaledVector(_c, speed * 0.6);
        else _des.copy(_c).multiplyScalar(speed * 0.65).addScaledVector(_a, (d - R) * 0.4);
        _des.y += (t.pos.y + ai.altOff + (t.static ? 6 : 0) - a.pos.y) * 0.9;
        if (Math.random() < dt * 0.25) ai.orbit = -ai.orbit;
      }
    } else if (ai.leader && ai.leader.alive) {
      // 편대 비행: 리더 뒤 좌우에 붙는다
      const L = ai.leader;
      _z.set(0, 0, 1).applyQuaternion(L.quat); _z.y = 0; if (_z.lengthSq() < 0.01) _z.set(0, 0, 1); _z.normalize();
      _x.set(_z.z, 0, -_z.x);
      const side = ai.slot % 2 ? 1 : -1, row = 1 + Math.floor(ai.slot / 2);
      _b.copy(L.pos).addScaledVector(_z, 5 * row).addScaledVector(_x, side * 5 * row); _b.y += 1.5;
      _des.copy(_b).sub(a.pos).multiplyScalar(1.4).add(L.vel);
      if (_des.length() > speed * 1.3) _des.setLength(speed * 1.3);
    } else if (ai.roam) {
      _des.copy(ai.roam).sub(a.pos); const d = _des.length(); _des.multiplyScalar(speed * 0.7 / Math.max(d, 1));
    }

    // 회피: 지면·천장·경계·장애물
    const gy = w.h(a.pos.x, a.pos.z) + 2.5 + BR;
    if (a.pos.y < gy + 3) _des.y += (gy + 3 - a.pos.y) * 2.5;
    if (a.pos.y > w.ceiling - 12) _des.y -= (a.pos.y - (w.ceiling - 12)) * 2;
    const lim = w.size - 12 - BR;
    if (Math.abs(a.pos.x) > lim) _des.x -= Math.sign(a.pos.x) * (Math.abs(a.pos.x) - lim) * 2;
    if (Math.abs(a.pos.z) > lim) _des.z -= Math.sign(a.pos.z) * (Math.abs(a.pos.z) - lim) * 2;
    _b.copy(a.pos).addScaledVector(a.vel, 0.55 + (BR - a.radius) * 0.04);
    if (col.querySphere(_b, BR + 2.2, _hit) && _hit.collider) {
      _des.addScaledVector(_hit.normal, speed * 1.1); _des.y += speed * 0.45;
      ai.stuck += dt; if (ai.stuck > 1.2) { ai.orbit = -ai.orbit; ai.stuck = 0; ai.roam = null; }
    } else ai.stuck = Math.max(0, ai.stuck - dt);
    // 서로 겹치지 않게
    for (const o of this.actors) {
      if (o === a || !o.alive || o.kind !== "bot") continue;
      const d = a.pos.distanceTo(o.pos), min = BR + (o.bodyR || o.radius) + 2.5;
      if (d < min && d > 0.01) _des.addScaledVector(_a.copy(a.pos).sub(o.pos), (min - d) * 3 / d);
    }

    // 속도 적분
    _a.copy(_des).sub(a.vel);
    const am = K.accel * (0.8 + ai.skill * 0.3) * dt, al = _a.length();
    if (al > am) _a.multiplyScalar(am / al);
    a.vel.add(_a);
    // 한 프레임 이동을 몸 반경보다 잘게 나눠 밀어낸다 (빠르거나 큰 기체가 벽·지형을 뚫고 지나가지 않게)
    const stepN = Math.min(6, Math.max(1, Math.ceil(a.vel.length() * dt / (BR * 0.5))));
    for (let k = 0; k < stepN; k++) {
      a.pos.addScaledVector(a.vel, dt / stepN);
      for (let it = 0; it < 3 && col.querySphere(a.pos, BR, _hit); it++) {
        a.pos.addScaledVector(_hit.normal, _hit.depth + 0.01);
        const vn = a.vel.dot(_hit.normal); if (vn < 0) a.vel.addScaledVector(_hit.normal, -1.4 * vn);
      }
    }
    const lim2 = w.size - 2 - BR;   // 맵 경계 밖으로는 나가지 않는다
    a.pos.x = clamp(a.pos.x, -lim2, lim2); a.pos.z = clamp(a.pos.z, -lim2, lim2);
    if (a.pos.y > w.ceiling - BR) { a.pos.y = w.ceiling - BR; if (a.vel.y > 0) a.vel.y = 0; }

    // 자세: 표적(또는 진행 방향)을 향하고 가속 방향으로 기운다
    if (face) _b.copy(face.pos).sub(a.pos); else _b.copy(a.vel);
    if (_b.x * _b.x + _b.z * _b.z > 0.5) {
      const want = Math.atan2(-_b.x, -_b.z);
      let dy = want - ai.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      ai.yaw += clamp(dy, -4 * dt, 4 * dt);
      ai.yawErr = Math.abs(dy);
    }
    _y.copy(UP).addScaledVector(_a, 0.5 / Math.max(am, 1e-3) * 0.55).addScaledVector(a.vel, 0.012).normalize();
    _z.set(Math.sin(ai.yaw), 0, Math.cos(ai.yaw));
    _x.crossVectors(_y, _z).normalize(); _z.crossVectors(_x, _y);
    _m.makeBasis(_x, _y, _z);
    a.quat.setFromRotationMatrix(_m);
    a.model.position.copy(a.pos);
    a.model.quaternion.slerp(a.quat, Math.min(1, dt * 8));
    a.model.userData.tick(dt, 0.4 + a.vel.length() / 50, this.s.time);

    // 사격
    ai.cool -= dt; ai.mcool -= dt;
    if (t && !K.boom && ai.los && !ai.goal) {
      const d = a.pos.distanceTo(t.pos);
      if (d < K.range * 3.2 && (ai.yawErr || 0) < 0.45) {
        if (ai.burst <= 0 && ai.cool <= 0) { ai.burst = 3 + ((Math.random() * 4) | 0); ai.cool = 0; }
        if (ai.burst > 0 && ai.cool <= 0) {
          ai.burst--; ai.cool = ai.burst > 0 ? 1 / K.rate : 0.9 + Math.random() * 1.2 - ai.skill * 0.4;
          this._lead(a.pos, t, 150, _aim).sub(a.pos).normalize();
          const spread = (0.012 + (1 - this.diff.aim) * 0.075) * (a.rk ? a.rk.aim : 1);
          _aim.x += (Math.random() - 0.5) * spread; _aim.y += (Math.random() - 0.5) * spread; _aim.z += (Math.random() - 0.5) * spread;
          _aim.normalize();
          _b.copy(a.pos).addScaledVector(_aim, a.radius + 0.4);
          const lc = this.ffa ? 0xff6a4d : a.team === 0 ? 0x66b8ff : 0xff5040;
          this.fireLaser(a, _b, _aim, K.dmg * (a.rk ? a.rk.dmg : 1) * (a.overT > 0 ? 2 : 1), lc, 92);
          this.fx.muzzle(_b, _aim, lc, K.scale * 0.6);
          this.snd.play("elaser", this.volAt(a.pos) * 0.7, this.panAt(a.pos));
        }
        if (a.missiles > 0 && ai.mcool <= 0 && d > 28 && d < 130 && !t.static) {
          a.missiles--; ai.mcool = (a.botKind === "boss" ? 3 : 7) + Math.random() * 5;
          _aim.copy(t.pos).sub(a.pos).normalize();
          _b.copy(a.pos).addScaledVector(_aim, a.radius + 1);
          this.fireMissile(a, _b, _aim, t, 30);
        }
      }
    }
  }

  _turret(a, dt) {
    const ai = a.ai;
    if (a.stunT > 0) return;
    if ((ai.think -= dt) <= 0) {
      ai.think = 0.3;
      let best = null, bd = ai.range;
      for (const o of this.actors) {
        if (!this.hostile(a, o) || o.static) continue;
        const d = o.pos.distanceTo(a.pos);
        if (d < bd && this._vis(a.pos, o, 1.5)) { bd = d; best = o; }
      }
      ai.target = best;
    }
    const t = ai.target;
    ai.cool -= dt;
    if (!t || !t.alive) { a.head.rotation.y += dt * 0.4; return; }
    this._lead(a.pos, t, 140, _aim).sub(a.pos);
    const want = Math.atan2(-_aim.x, -_aim.z), wp = Math.atan2(_aim.y, Math.hypot(_aim.x, _aim.z));
    let dy = want - ai.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    ai.yaw += clamp(dy, -2.6 * dt, 2.6 * dt);
    ai.pitch += clamp(wp - ai.pitch, -2 * dt, 2 * dt);
    a.head.rotation.set(ai.pitch, ai.yaw, 0, "YXZ");
    if (Math.abs(dy) < 0.12 && ai.cool <= 0) {
      if (ai.burst <= 0) ai.burst = 3;
      ai.burst--; ai.cool = ai.burst > 0 ? 0.13 : 1.5 - ai.skill * 0.5;
      _aim.normalize();
      const spread = 0.015 + (1 - this.diff.aim) * 0.07;
      _aim.x += (Math.random() - 0.5) * spread; _aim.y += (Math.random() - 0.5) * spread; _aim.z += (Math.random() - 0.5) * spread;
      _aim.normalize();
      _b.copy(a.pos).addScaledVector(_aim, 2.6);
      this.fireLaser(a, _b, _aim, 7, a.team === 0 ? 0x66b8ff : 0xffa040, 86);
      this.fx.muzzle(_b, _aim, a.team === 0 ? 0x66b8ff : 0xffa040, 2.2);
      this.snd.play("elaser", this.volAt(a.pos) * 0.6, this.panAt(a.pos));
    }
  }

  // 점수판 행: 드론(플레이어·AI)만
  board() {
    return this.actors.filter((a) => a.kind === "player" || (a.kind === "bot" && a.respawns) || (a.remote && (a.isPilot || a.isBot))).sort((a, b) => b.score - a.score);
  }

  dispose() {
    const sc = this.w.scene;
    if (this.skill) this.skill.dispose();
    this.units.dispose();
    for (const a of this.actors) if (a.model && a.kind !== "player") { sc.remove(a.model); if (a.model.userData.dispose) a.model.userData.dispose(); }
    for (const m of this.missiles) { sc.remove(m.mesh); m.mesh.userData.glow.material.dispose(); }
    for (const p of this.pickups) { sc.remove(p.g); p.mat.dispose(); p.beamMat.dispose(); }
    this.missileGeo.dispose(); this.mGlowGeo.dispose(); this.missileMat.dispose(); this.pickGeo.dispose(); this.ringGeo.dispose(); this.beamGeo.dispose(); this.haloGeo.dispose();
    this.s.player.body.boost = 1;
  }
}
