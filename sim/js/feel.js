// 화면 효과 관리자: 상태(공격·명중·충돌·조준·피해 등)에 따른 화면 흔들림·색·소리·진동
// emit(type, k, data) 로 사건을 알리면 update() 가 카메라를 흔들고 draw() 가 HUD 캔버스에 전체 화면 색 효과를 그린다.
// 흔들림은 "그려지는 카메라"에만 더해진다 — 조준(aimDir/aimPos)·물리·판정에는 영향이 없다.
// 설정: settings.fx.shake(흔들림 배율 0~1.5) · settings.fx.flash(색 효과 0~1, 0 이면 아무것도 안 그림) · settings.fx.rumble(진동)
import * as THREE from "../vendor/three.module.min.js";
import { settings, clamp } from "./config.js";

const DEG = Math.PI / 180;
const GL_FILTER = true;      // 신호 끊김 때 3D 캔버스의 채도를 CSS 필터로 낮춘다 (문제가 되면 false)
const _v = new THREE.Vector3(), _o = new THREE.Vector3();
const _q = new THREE.Quaternion(), _e = new THREE.Euler();

// 색 ("r,g,b")
const RED = "255,44,44", CYAN = "60,215,255", WHITE = "255,255,255", GOLD = "255,205,70", GREEN = "60,255,130";
const ORANGE = "255,140,40", AMBER = "255,176,32", MAGENTA = "255,80,215", YELLOW = "255,225,74", BLUE = "150,190,255", BLACK = "0,0,0";

const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// 부드러운 1차원 노이즈 (-1..1)
const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); const a = hash(i), b = hash(i + 1); return (a + (b - a) * u) * 2 - 1; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hexRgb = (h) => `${(h >> 16) & 255},${(h >> 8) & 255},${h & 255}`;

export class Feel {
  constructor(session) {
    this.s = session;
    this.snd = session.game.sound;
    this.inp = session.game.input;
    this.t = 0;
    this.over = false;        // 결과가 나온 뒤: 새 효과를 받지 않고 서서히 걷어낸다
    this.fade = 1;

    // ── 카메라 ──
    this.trauma = 0;                                             // 0..1 흔들림 양 (제곱해서 사용)
    this.rot = [0, 0, 0]; this.rotV = [0, 0, 0];                 // 방향 킥: 피치·요·롤 (rad) 스프링
    this.pos = [0, 0, 0]; this.posV = [0, 0, 0];                 // 방향 킥: 카메라 좌표 이동 (m) 스프링
    this.fovPunch = 0; this.fovV = 0;                            // FOV 순간 변화(°) 스프링
    this.fovSpeed = 0;                                           // 속도·부스터에 따른 FOV 확대(°)
    this.clean = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 0, dirty: false };
    this.shakeDeg = 0;                                           // 이번 프레임에 실제로 더한 회전 크기(°) — 점검용
    this.offDeg = 0; this.offPos = 0; this.offFov = 0;

    // ── 색 효과 ──
    this.hurtA = 0; this.hurtAng = 0; this.hurtBias = 0;         // 피격: 붉은 비네트 (+방향)
    this.lowK = 0; this.beatA = 0; this.beatT = 0;               // 빈사: 심장 박동에 맞춘 붉은 테두리
    this.warnA = 0; this.warnPh = 0;                             // 미사일 접근: 깜빡이는 테두리
    this.breakup = 0;                                            // 영상 신호 끊김(잡음·탈색) 0..1
    this.deadA = 0; this.stunA = 0; this.heatA = 0;
    this.boostK = 0; this.overK = 0; this.streak = 0; this.streakPulse = 0;
    this.muzzleA = 0; this.muzzleSide = 1; this.muzzleHot = false;
    this.fullA = 0; this.fullCol = "#fff"; this.fullDecay = 4; this.fullCool = 0;
    this.slots = [];                                             // 짧은 테두리 번쩍임
    for (let i = 0; i < 5; i++) this.slots.push({ a: 0, decay: 4, img: null });
    this.sprites = new Map();
    this.im = null;
    this.pat = null; this.patG = null;
    this.filterStep = 0;
    this.drawn = 0;                                              // 마지막 draw() 가 그린 전체 화면 레이어 수 — 점검용

    // ── 소리·진동·상태 추적 ──
    this.hitCombo = 0; this.hitGap = 0; this.hitCueT = -1;
    this.prevAim = null; this.aimCool = 0;
    this.lockBeepT = 0; this.lockToneT = 0;
    this.pickColor = 0;
    this.rS = 0; this.rW = 0; this.rMs = 0; this.rCool = 0;      // 이번 프레임 진동 요청(최댓값)
    this.rumbleN = 0; this.lastRS = 0; this.lastRW = 0; this.lastRMs = 0;
    this.gl = session.game.renderer ? session.game.renderer.domElement : null;
  }

  // ── 기본 동작 ──
  addTrauma(x) { this.trauma = Math.min(1, this.trauma + x); }
  // 순간 회전 킥(rad): 피치(+ 위), 요(+ 왼쪽), 롤
  kickRot(p, y = 0, r = 0) { this.rot[0] += p; this.rot[1] += y; this.rot[2] += r; }
  kickPos(x, y, z) { this.pos[0] += x; this.pos[1] += y; this.pos[2] += z; }
  cue(name, vol = 1, pan = 0, pitch = 1) { if (this.snd && this.snd.cue) this.snd.cue(name, vol, pan, pitch); }
  rumble(strong, weak, ms) { if (strong > this.rS) this.rS = strong; if (weak > this.rW) this.rW = weak; if (ms > this.rMs) this.rMs = ms; }

  // 테두리 번쩍임. shape: frame(가장자리 띠) | thin(얇은 띠) | vig(둥근 비네트)
  flash(col, a, decay = 4, shape = "frame") {
    let best = this.slots[0];
    for (const s of this.slots) if (s.a < best.a) best = s;
    best.a = Math.min(1, a); best.decay = decay; best.img = this._sprite(shape, col);
  }

  // 화면 전체 번쩍임: 세기 상한과 최소 간격을 둬 광과민 위험을 줄인다
  fullFlash(col, a, decay = 4) {
    if (this.fullCool > 0 && a <= this.fullA) return;
    this.fullA = Math.min(0.32, Math.max(this.fullA, a)); this.fullCol = `rgb(${col})`; this.fullDecay = decay; this.fullCool = 0.4;
  }

  // 월드 좌표의 한 점이 화면에서 어느 쪽인지 (플레이어 기준, 카메라 좌표). 결과: this._dx, _dy(화면 아래가 +), _bias(0=정면, 1=옆)
  _dirFrom(p) {
    this._dx = 0; this._dy = 0; this._bias = 0; this._cz = -1;
    if (!p) return;
    const cam = this.s.camera;
    _v.copy(p).sub(this.s.player.body.pos);
    const d = _v.length();
    if (d < 0.05) return;
    _v.multiplyScalar(1 / d).applyQuaternion(_q.copy(cam.quaternion).invert());
    const lat = Math.hypot(_v.x, _v.y);
    this._cz = _v.z;
    if (lat < 0.12) { if (_v.z > 0) { this._dy = 1; this._bias = 0.6; } return; }   // 바로 뒤 → 화면 아래쪽
    this._dx = _v.x / lat; this._dy = -_v.y / lat;
    this._bias = _v.z > 0 ? 1 : lat;
  }

  // 화면 방향(dx, dy)에서 맞았을 때: 반대쪽으로 고개가 꺾인다
  _kickAway(amt) {
    this.kickRot(this._dy * amt * 0.8, this._dx * amt, this._dx * amt * 0.7);
    this.kickPos(-this._dx * amt * 1.6, this._dy * amt * 1.6, this._cz < 0 ? amt * 1.2 : -amt * 1.2);
  }

  // ── 사건 알림 ──
  // fire | missile | overheat | cool | dry | hit | kill | hurt | shield | shieldBreak | shieldUp | shieldDown | stun | death | respawn
  // crash | impact | scrape | nearmiss | blast | zip | item
  emit(type, k = 1, data = null) {
    if (this.over) return;
    switch (type) {
      // ── 공격 ──
      case "fire":                       // k: 1(일반) / 1.5(과충전), data: 좌우 총구(-1 | 1)
        this.addTrauma(0.03 * k);
        this.kickRot(0.2 * k * DEG, 0, (data || 0) * 0.12 * DEG);
        this.kickPos(0, 0, 0.012 * k);
        this.muzzleA = 1; this.muzzleSide = data || 1; this.muzzleHot = k > 1.2;
        this.rumble(0, 0.16 * k, 35);
        break;
      case "missile":
        this.addTrauma(0.22);
        this.kickRot(1.15 * DEG); this.kickPos(0, -0.01, 0.07);
        this.fovPunch += 2.6;
        this.flash(ORANGE, 0.22, 5, "thin");
        this.rumble(0.55, 0.4, 170);
        break;
      case "overheat":
        this.addTrauma(0.1);
        this.flash(ORANGE, 0.34, 3);
        this.cue("overheat");
        this.rumble(0.3, 0.25, 220);
        break;
      case "cool": this.cue("cool"); break;
      case "dry": this.cue("dry"); this.rumble(0, 0.12, 25); break;

      // ── 명중 ──
      case "hit":                        // 내 공격이 적에게 명중. 연속 명중이면 확인음이 점점 높아진다
        this.hitCombo = this.hitGap > 0 ? Math.min(12, this.hitCombo + 1) : 0;
        this.hitGap = 0.7;
        if (this.t - this.hitCueT > 0.035) { this.hitCueT = this.t; this.cue("hitc", 0.9, 0, Math.pow(2, this.hitCombo / 16)); }
        this.flash(WHITE, 0.09 + Math.min(0.06, k / 300), 10, "thin");
        this.rumble(0, 0.22, 30);
        break;
      case "kill": {                     // k: 1 드론 · 2 포탑/건십 · 4 코어/보스
        const big = k >= 2;
        this.cue(big ? "bigkill" : "killc");
        this.flash(GOLD, big ? 0.55 : 0.36, big ? 2 : 3.4);
        if (k >= 4) this.fullFlash("255,236,190", 0.24, 2.4);
        this.fovPunch -= big ? 2.6 : 1.4;                        // 순간적으로 조여드는 타격감
        this.addTrauma(big ? 0.3 : 0.14);
        this.rumble(big ? 0.85 : 0.45, big ? 0.6 : 0.5, big ? 340 : 140);
        break;
      }

      // ── 피해 ──
      case "hurt": {                     // k: 피해량, data: 공격이 온 위치(Vector3)
        const a = clamp(k / 30, 0.15, 1);
        this.addTrauma(0.14 + a * 0.5);
        this._dirFrom(data);
        this.hurtA = Math.min(1, Math.max(this.hurtA, 0.25 + a * 0.75));
        this.hurtAng = Math.atan2(this._dy, this._dx); this.hurtBias = this._bias;
        this._kickAway((0.5 + a * 1.5) * DEG);
        this.rumble(0.35 + a * 0.6, 0.3 + a * 0.4, 90 + a * 170);
        break;
      }
      case "shield":                     // 실드가 막음. k: 흡수량
        this.addTrauma(0.05 + Math.min(0.12, k / 150));
        this._dirFrom(data); this._kickAway(0.35 * DEG);
        this.flash(CYAN, 0.34 + Math.min(0.26, k / 60), 5);
        this.rumble(0.15, 0.4, 60);
        break;
      case "shieldBreak":
        this.addTrauma(0.3);
        this.flash(CYAN, 0.7, 2.4, "vig");
        this.fullFlash("190,240,255", 0.18, 4);
        this.cue("shieldbreak");
        this.rumble(0.6, 0.7, 230);
        break;
      case "shieldUp": this.flash(CYAN, 0.4, 2.4); this.cue("shieldup"); this.rumble(0.1, 0.3, 120); break;
      case "shieldDown": this.cue("shielddown"); break;
      case "stun":                       // EMP 피격
        this.addTrauma(0.6);
        this.breakup = Math.max(this.breakup, 0.85);
        this.fullFlash("200,222,255", 0.3, 3);
        this.cue("stun");
        this.rumble(0.9, 0.9, 400);
        break;
      case "death":
        this.trauma = 1; this.breakup = 1; this.hurtA = 1; this.hurtBias = 0;
        this.fullFlash(WHITE, 0.3, 3);
        this.cue("death");
        this.rumble(1, 1, 450);
        break;
      case "respawn":
        if (this.s.time <= 0) break;     // 판 시작 때의 첫 배치는 제외
        this.trauma = 0; this.hurtA = 0; this.deadA = 0;
        this.breakup = Math.min(this.breakup, 0.5);
        this.flash(WHITE, 0.36, 3, "vig");
        this.fullFlash("220,240,255", 0.16, 5);
        this.cue("respawn");
        this.rumble(0.1, 0.35, 120);
        break;

      // ── 충돌 ──
      case "crash":                      // 추락(조종 불능)
        this.trauma = 1; this.breakup = 1;
        this.cue("static");
        this.rumble(1, 0.8, 360);
        break;
      case "impact": {                   // k: 충돌 속도(m/s), data: { hard, n(면 법선) }
        const a = clamp(k / 12, 0.1, 1);
        this.addTrauma(0.1 + a * 0.5);
        if (data && data.n) {            // 부딪힌 면의 반대쪽으로 화면이 밀린다
          _v.copy(data.n).applyQuaternion(_q.copy(this.s.camera.quaternion).invert());
          this.kickPos(_v.x * 0.05 * a, _v.y * 0.05 * a, _v.z * 0.05 * a);
          this.kickRot(_v.y * (0.3 + a * 1.3) * DEG, -_v.x * (0.3 + a * 1.3) * DEG, -_v.x * a * 0.9 * DEG);
        }
        if (a > 0.3) this.flash(WHITE, 0.1 + a * 0.22, 6, "thin");
        if (data && data.hard) {
          this.addTrauma(0.3);
          this.breakup = Math.max(this.breakup, 0.62);
          this.fullFlash(WHITE, 0.12, 6);
          this.cue("static", 0.7);
        }
        this.rumble(0.3 + a * 0.7, 0.2 + a * 0.5, 60 + a * 210);
        break;
      }
      case "scrape":                     // 표면을 긁으며 미끄러짐. k: 0..1
        this.addTrauma(0.025 + 0.03 * k);
        this.cue("scrape", 0.4 + 0.6 * k);
        this.rumble(0.1, 0.2 + 0.2 * k, 60);
        break;
      case "nearmiss":                   // 장애물을 아슬아슬하게 스침. k: 0..1, data: 좌우(-1..1)
        this.addTrauma(0.05 * k);
        this.streakPulse = Math.max(this.streakPulse, 0.35 + 0.5 * k);
        this.cue("whoosh", 0.45 + 0.55 * k, data || 0, 0.85 + Math.random() * 0.3);
        this.rumble(0, 0.2 + 0.25 * k, 70);
        break;
      case "blast":                      // 가까운 폭발. k: 세기 0..1, data: 위치
        this.addTrauma(k * 0.7);
        this._dirFrom(data); this._kickAway(k * 1.4 * DEG);
        if (k > 0.45) this.fullFlash("255,226,180", k * 0.22, 4);
        this.rumble(k, k * 0.7, 120 + k * 260);
        break;
      case "zip": this.addTrauma(0.035); this.rumble(0, 0.15, 30); break;   // 적탄이 스쳐 지나감

      // ── 아이템 ──
      case "item":                       // data: 아이템 종류
        if (data === "boost") { this.fovPunch += 5; this.flash(YELLOW, 0.5, 2.4); this.addTrauma(0.16); this.cue("boost"); this.rumble(0.5, 0.6, 260); }
        else if (data === "overcharge") { this.flash(MAGENTA, 0.5, 2.4); this.rumble(0.3, 0.5, 180); }
        else if (data === "emp") { this.fullFlash("190,212,255", 0.28, 3); this.flash(BLUE, 0.6, 2.2, "vig"); this.addTrauma(0.35); this.rumble(0.8, 0.8, 300); }
        break;
    }
  }

  // 효과음이 재생될 때마다 호출됨 (audio.js). 모드 코드가 내는 소리로 사건을 유추한다
  onSound(name) {
    if (this.over && name !== "win" && name !== "fail") return;
    switch (name) {
      case "gate": this.flash(GREEN, 0.34, 4.5); this.fovPunch += 1.6; this.addTrauma(0.05); this.streakPulse = Math.max(this.streakPulse, 0.5); this.rumble(0.15, 0.4, 70); break;
      case "lap": this.flash(GOLD, 0.5, 2.2); this.fovPunch += 2.4; this.rumble(0.4, 0.5, 200); break;
      case "beep": this.flash(WHITE, 0.14, 6, "thin"); this.rumble(0, 0.2, 40); break;
      case "go": this.flash(GREEN, 0.45, 3); this.fovPunch += 3; this.rumble(0.3, 0.6, 180); break;
      case "trick": this.flash(CYAN, 0.2, 5, "thin"); this.rumble(0, 0.3, 60); break;
      case "combo": this.flash(MAGENTA, 0.34, 3.5); this.fovPunch += 1.2; this.rumble(0.2, 0.5, 140); break;
      case "pickup": this.flash(this.pickColor ? hexRgb(this.pickColor) : YELLOW, 0.4, 3.5); this.pickColor = 0; this.rumble(0.1, 0.4, 90); break;
      case "lock": this.flash(RED, 0.24, 5, "thin"); this.rumble(0.2, 0.5, 90); break;
      case "warn": {
        const c = this.s.mode && this.s.mode.combat;
        if (!(c && c.warn > 0)) this.flash(AMBER, 0.36, 3.2);     // 임무 경고(미사일 경보는 update 가 지속 표시)
        this.rumble(0.25, 0.25, 110);
        break;
      }
      case "win": this.flash(GOLD, 0.55, 1.1, "vig"); this.rumble(0.4, 0.6, 400); break;
      case "fail": this.flash(RED, 0.45, 1.1, "vig"); this.rumble(0.5, 0.2, 300); break;
    }
  }

  // 지난 프레임에 더한 흔들림을 걷어낸다. 게임 로직(모드·판정)은 흔들리지 않은 카메라만 본다
  restore(cam) {
    const c = this.clean;
    if (!c.dirty) return;
    c.dirty = false;
    cam.position.copy(c.pos); cam.quaternion.copy(c.quat);
    if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  }

  // 전투·비행 상태를 읽어 지속 효과(빈사·경보·조준·락온·속도감)를 갱신
  _poll(dt) {
    const s = this.s, pl = s.player, b = pl.body, mode = s.mode;
    const c = mode && mode.combat, p = c && c.player;
    const run = mode && mode.state === "run" && !this.over;
    let low = 0, warn = false, heat = 0, stun = false, dead = false, boost = 0, over = 0, hold = 0;

    if (p && run) {
      dead = !p.alive; stun = p.alive && p.stunT > 0;
      if (p.alive) {
        // 빈사: 체력 30% 아래부터 심장 박동
        const f = p.hp / p.maxHp;
        if (f < 0.3) low = 1 - f / 0.3;
        heat = p.overheated ? 1 : smooth(0.72, 1, p.heat) * 0.6;
        boost = p.boostT > 0 ? Math.min(1, p.boostT * 2) : 0;
        over = p.overT > 0 ? Math.min(1, p.overT * 2) : 0;
        warn = c.warn > 0;
        // 조준선에 적이 들어옴
        this.aimCool -= dt;
        if (c.aim && c.aim !== this.prevAim && this.aimCool <= 0) { this.aimCool = 0.25; this.cue("aim"); this.rumble(0, 0.14, 25); }
        this.prevAim = c.aim;
        // 락온 진행: 0.7초에 가까워질수록 빨라지고 높아지는 신호음, 완료 후에는 잔잔한 유지음
        if (c.lock && p.missiles > 0 && c.lockT > 0) {
          if (c.lockT < 0.7) {
            const k = c.lockT / 0.7;
            if ((this.lockBeepT -= dt) <= 0) { this.lockBeepT = 0.19 - 0.13 * k; this.cue("lockbeep", 0.8, 0, 1 + k * 0.5); }
            this.lockToneT = 0.45;
          } else if ((this.lockToneT -= dt) <= 0) { this.lockToneT = 0.45; this.cue("locktone", 0.7); }
        } else { this.lockBeepT = 0; this.lockToneT = 0.45; }
      } else this.prevAim = null;
    } else this.prevAim = null;

    // 심장 박동
    this.lowK += (low - this.lowK) * Math.min(1, dt * 6);
    if (low > 0) {
      if ((this.beatT -= dt) <= 0) {
        this.beatT = 0.95 - 0.4 * low;
        this.beatA = 1;
        this.cue("heart", 0.45 + 0.55 * low);
        this.rumble(0.12 + 0.22 * low, 0, 70);
      }
    } else this.beatT = 0.2;
    this.beatA *= Math.exp(-dt * 5.5);

    // 미사일 경보: 가까울수록 빨리 깜빡인다 (초당 3회 이하)
    if (warn) {
      const near = c.warnDist !== undefined ? 1 - clamp(c.warnDist / 120, 0, 1) : 0.5;
      this.warnPh += dt * (1.5 + 1.3 * near);
      this.warnA = Math.min(1, this.warnA + dt * 8);
    } else this.warnA = Math.max(0, this.warnA - dt * 4);

    // 신호 끊김: 추락·격추·EMP 동안은 일정 수준 유지
    if (pl.crashed && !this.over) hold = 0.36;
    if (dead) hold = Math.max(hold, 0.3);
    if (stun) { hold = Math.max(hold, 0.42 + 0.12 * Math.sin(this.t * 23)); if (this.trauma < 0.22) this.trauma = 0.22; }
    this.breakup = Math.max(hold, this.breakup - dt * (this.breakup > 0.6 ? 2.6 : 1.3));
    const lr = Math.min(1, dt * 5);
    this.deadA += ((dead ? 1 : 0) - this.deadA) * (dead ? Math.min(1, dt * 2.5) : Math.min(1, dt * 8));
    this.stunA += ((stun ? 1 : 0) - this.stunA) * lr;
    this.heatA += (heat - this.heatA) * Math.min(1, dt * 7);
    this.boostK += (boost - this.boostK) * lr;
    this.overK += (over - this.overK) * lr;

    // 속도감: 고속·부스터에서 가장자리 속도선과 FOV 확대
    const sp = b.speed, fly = pl.camMode !== "los" && !pl.crashed && run;
    const st = fly ? Math.max(smooth(26, 50, sp) * 0.75, this.boostK * smooth(8, 22, sp)) : 0;
    this.streakPulse = Math.max(0, this.streakPulse - dt * 2.2);
    this.streak += (st - this.streak) * Math.min(1, dt * 4);
    const fs = fly ? smooth(9, 46, sp) * 7 + this.boostK * 5 : 0;
    this.fovSpeed += (fs - this.fovSpeed) * Math.min(1, dt * 3);

    // 소리 레이어: 신호 잡음, 먹먹함
    if (this.snd && this.snd.layers) this.snd.layers(this.breakup * this.fade, Math.max(this.deadA * 0.75, this.stunA * 0.5, this.lowK * 0.22, pl.crashed ? 0.45 : 0) * this.fade);
  }

  // 카메라 자세가 정해진 직후 호출: 흔들림·킥·FOV 변화를 카메라에 더한다
  update(dt, cam) {
    const s = this.s;
    this.t += dt;
    this.over = !!s.result;
    const shown = !!s.resultShown || s.game.state === "result";
    this.fade = this.over ? Math.max(0, this.fade - dt * (shown ? 6 : 1.2)) : 1;
    if (this.over) this.trauma = 0;

    this._poll(dt);

    // 감쇠
    this.trauma = Math.max(0, this.trauma - dt * (1.3 + this.trauma * 1.3));
    this.hurtA = Math.max(0, this.hurtA - dt * 1.9);
    this.muzzleA = Math.max(0, this.muzzleA - dt * 14);
    this.fullA *= Math.exp(-dt * this.fullDecay); if (this.fullA < 0.004) this.fullA = 0;
    this.fullCool -= dt;
    if (this.hitGap > 0) this.hitGap -= dt;
    for (const f of this.slots) if (f.a > 0) { f.a *= Math.exp(-dt * f.decay); if (f.a < 0.004) f.a = 0; }
    this._flushRumble(dt);

    // 스프링 (킥·FOV): 작은 간격으로 나눠 적분
    const n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < 3; a++) {
        this.rotV[a] += (-330 * this.rot[a] - 22 * this.rotV[a]) * h; this.rot[a] += this.rotV[a] * h;
        this.posV[a] += (-300 * this.pos[a] - 24 * this.posV[a]) * h; this.pos[a] += this.posV[a] * h;
      }
      this.fovV += (-210 * this.fovPunch - 21 * this.fovV) * h; this.fovPunch += this.fovV * h;
    }
    const RL = 2.8 * DEG;
    for (let a = 0; a < 3; a++) { this.rot[a] = clamp(this.rot[a], -RL, RL); this.pos[a] = clamp(this.pos[a], -0.12, 0.12); }
    this.fovPunch = clamp(this.fovPunch, -5, 8);

    // 카메라에 적용
    const c = this.clean;
    c.pos.copy(cam.position); c.quat.copy(cam.quaternion); c.fov = cam.fov; c.dirty = false;
    this.shakeDeg = 0; this.offDeg = 0; this.offPos = 0; this.offFov = 0;
    const SH = shown ? 0 : clamp(settings.fx ? +settings.fx.shake || 0 : 1, 0, 1.5);
    if (SH <= 0) return;
    const fpv = s.player.camMode === "fpv", los = s.player.camMode === "los";
    const view = clamp(cam.fov / 90, 0.1, 1.1);                  // 망원(LOS)일수록 같은 각도가 크게 보이므로 줄인다
    const sh = this.trauma * this.trauma * SH * view * (fpv ? 0.8 : 1);
    const t = this.t;
    let rx = this.rot[0] * SH * view, ry = this.rot[1] * SH * view, rz = this.rot[2] * SH * view;
    let px = this.pos[0] * SH, py = this.pos[1] * SH, pz = this.pos[2] * SH;
    if (sh > 1e-5) {
      const sx = noise(t * 23.1 + 11.3) * 1.5 * DEG * sh, sy = noise(t * 21.7 + 47.9) * 1.5 * DEG * sh, sz = noise(t * 19.3 + 83.1) * 2.2 * DEG * sh;
      rx += sx; ry += sy; rz += sz;
      px += noise(t * 17.9 + 5.7) * 0.05 * sh; py += noise(t * 18.7 + 29.3) * 0.05 * sh;
      this.shakeDeg = Math.hypot(sx, sy, sz) / DEG;
    }
    if (fpv) { px *= 0.25; py *= 0.25; pz *= 0.25; }                // FPV 는 카메라가 기체 안에 있으므로 이동은 아주 작게
    const fv = (los ? this.fovPunch * 0.25 : this.fovSpeed + this.fovPunch) * Math.min(1, SH);
    const rm = Math.abs(rx) + Math.abs(ry) + Math.abs(rz), pm = Math.abs(px) + Math.abs(py) + Math.abs(pz);
    if (rm < 1e-6 && pm < 1e-6 && Math.abs(fv) < 1e-3) return;
    _q.setFromEuler(_e.set(rx, ry, rz, "YXZ"));
    cam.quaternion.multiply(_q);
    cam.position.add(_o.set(px, py, pz).applyQuaternion(c.quat));
    if (Math.abs(fv) >= 1e-3) { cam.fov = clamp(c.fov + fv, 8, 140); cam.updateProjectionMatrix(); }
    c.dirty = true;
    this.offDeg = Math.hypot(rx, ry, rz) / DEG; this.offPos = Math.hypot(px, py, pz); this.offFov = cam.fov - c.fov;
  }

  _flushRumble(dt) {
    this.rCool -= dt;
    if (this.rMs > 0 && settings.fx && settings.fx.rumble && (this.rCool <= 0 || this.rS > this.lastRS + 0.25)) {
      this.lastRS = this.rS; this.lastRW = this.rW; this.lastRMs = this.rMs;
      this.rumbleN++;
      this.rCool = 0.045;
      if (this.inp && this.inp.rumble) this.inp.rumble(this.rS, this.rW, this.rMs);
    }
    this.rS = this.rW = this.rMs = 0;
  }

  // ── 그리기용 스프라이트 (색·모양별로 한 번만 만든다) ──
  _sprite(shape, col) {
    const key = shape + col;
    let cv = this.sprites.get(key);
    if (cv) return cv;
    const S = 128;
    cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"), rgba = (a) => `rgba(${col},${a})`;
    if (shape === "vig") {              // 둥근 비네트: 가운데는 비우고 모서리로 갈수록 진하게
      const gr = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72);
      gr.addColorStop(0, rgba(0)); gr.addColorStop(0.35, rgba(0.14)); gr.addColorStop(0.7, rgba(0.55)); gr.addColorStop(1, rgba(1));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    } else if (shape === "frame" || shape === "thin") {   // 화면 가장자리를 따라가는 띠
      const w = S * (shape === "thin" ? 0.1 : 0.17), top = shape === "thin" ? 0.8 : 0.9;
      for (let i = 0; i < 4; i++) {
        const gr = i === 0 ? g.createLinearGradient(0, 0, 0, w) : i === 1 ? g.createLinearGradient(0, S, 0, S - w) : i === 2 ? g.createLinearGradient(0, 0, w, 0) : g.createLinearGradient(S, 0, S - w, 0);
        gr.addColorStop(0, rgba(top)); gr.addColorStop(0.35, rgba(top * 0.4)); gr.addColorStop(1, rgba(0));
        g.fillStyle = gr;
        if (i === 0) g.fillRect(0, 0, S, w); else if (i === 1) g.fillRect(0, S - w, S, w); else if (i === 2) g.fillRect(0, 0, w, S); else g.fillRect(S - w, 0, w, S);
      }
    } else if (shape === "side") {      // 한쪽(+x)에서 번져 들어오는 빛 — 회전시켜 방향 표시
      const gr = g.createRadialGradient(S * 1.1, S / 2, S * 0.1, S * 1.1, S / 2, S * 1.05);
      gr.addColorStop(0, rgba(1)); gr.addColorStop(0.45, rgba(0.5)); gr.addColorStop(1, rgba(0));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    } else {                            // blob: 둥근 빛 덩이
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, rgba(0.95)); gr.addColorStop(0.4, rgba(0.4)); gr.addColorStop(1, rgba(0));
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
    }
    this.sprites.set(key, cv);
    return cv;
  }

  // 지속 효과용 스프라이트는 처음 그릴 때 한꺼번에 준비 (프레임마다 문자열 키를 만들지 않도록)
  _ensure() {
    const S = (shape, col) => this._sprite(shape, col);
    return (this.im = {
      vigRed: S("vig", RED), vigBlack: S("vig", BLACK), vigBlue: S("vig", BLUE), sideRed: S("side", RED), sideOrange: S("side", ORANGE),
      frameRed: S("frame", RED), thinYellow: S("thin", YELLOW), thinMagenta: S("thin", MAGENTA), blobCyan: S("blob", CYAN), blobMagenta: S("blob", MAGENTA),
    });
  }

  _layer(g, img, a, W, H) {
    if (a <= 0.004) return;
    g.globalAlpha = a > 1 ? 1 : a;
    g.drawImage(img, 0, 0, W, H);
    this.drawn++;
  }

  // 화면 중심에서 ang 방향 가장자리에 붙는 방향성 빛
  _side(g, img, a, ang, W, H) {
    if (a <= 0.004) return;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const d = 1 / Math.max(Math.abs(cs) / (W / 2), Math.abs(sn) / (H / 2));   // 중심 → 화면 테두리 거리
    const D = d * 0.72, L = (Math.abs(cs) * H + Math.abs(sn) * W) * 1.15;      // 안쪽 깊이, 테두리를 따라가는 길이
    g.save();
    g.globalAlpha = a > 1 ? 1 : a;
    g.translate(W / 2, H / 2); g.rotate(ang);
    g.drawImage(img, d - D, -L / 2, D * 1.25, L);
    g.restore();
    this.drawn++;
  }

  _noisePattern(g) {
    if (this.pat && this.patG === g) return this.pat;
    const S = 64, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const x = cv.getContext("2d"), im = x.createImageData(S, S), d = im.data;
    for (let i = 0; i < S * S; i++) {
      const v = Math.random(), on = Math.random() < 0.55;
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v < 0.5 ? 20 + v * 120 : 150 + v * 105;
      d[i * 4 + 3] = on ? 90 + Math.random() * 165 : 0;
    }
    x.putImageData(im, 0, 0);
    this.pat = g.createPattern(cv, "repeat"); this.patG = g;
    return this.pat;
  }

  // 3D 캔버스 채도 낮춤 (신호 끊김·격추). 단계가 바뀔 때만 스타일을 건드린다
  _filter(k) {
    if (!GL_FILTER || !this.gl) return;
    const step = Math.round(clamp(k, 0, 1) * 8);
    if (step === this.filterStep) return;
    this.filterStep = step;
    this.gl.style.filter = step ? `saturate(${(1 - step * 0.1).toFixed(2)}) contrast(${(1 + step * 0.015).toFixed(3)})` : "";
  }

  // HUD 캔버스에 전체 화면 색 효과를 그린다 (HUD 요소보다 먼저). 화면 가운데는 가리지 않는다
  draw(hud) {
    this.drawn = 0;
    const F = clamp(settings.fx ? +settings.fx.flash || 0 : 1, 0, 1) * this.fade;
    if (F <= 0.002) { this._filter(0); return; }
    const g = hud.g, W = hud.W, H = hud.H, u = hud.u, t = this.t;
    const fpv = this.s.player.camMode === "fpv", im = this.im || this._ensure();
    g.save();

    // 1) 영상 신호 끊김: 탈색 + 회색 덮개 + 잡음 + 가로 줄
    const bk = this.breakup;
    this._filter(Math.max(bk, this.deadA * 0.85) * F);
    if (bk > 0.02) {
      g.globalAlpha = bk * 0.22 * F; g.fillStyle = "rgb(120,126,132)"; g.fillRect(0, 0, W, H);
      const k = Math.max(2, Math.round(3 * u)), ox = (Math.random() * 64) | 0, oy = (Math.random() * 64) | 0;
      g.save();
      g.globalAlpha = Math.min(0.5, bk * 0.5) * F;
      g.imageSmoothingEnabled = false;
      g.scale(k, k); g.translate(-ox, -oy);
      g.fillStyle = this._noisePattern(g);
      g.fillRect(ox, oy, W / k + 1, H / k + 1);
      g.restore();
      const n = 1 + ((bk * 5) | 0), tick = (t * 15) | 0;
      for (let i = 0; i < n; i++) {
        const y = hash(tick * 7.3 + i * 13.7) * H, hh = (3 + hash(tick * 3.1 + i * 5.9) * 20) * u;
        g.globalAlpha = bk * (i % 2 ? 0.2 : 0.34) * F;
        g.fillStyle = i % 2 ? "#fff" : "#05070a";
        g.fillRect(i % 3 === 2 ? hash(tick + i) * W * 0.5 : 0, y, i % 3 === 2 ? W * 0.5 : W, hh);
      }
      this.drawn += 2;
    }

    // 2) 격추: 어둡게 조여드는 테두리
    if (this.deadA > 0.01) { this._layer(g, im.vigBlack, this.deadA * 0.9 * F, W, H); this._layer(g, im.vigRed, this.deadA * 0.3 * F, W, H); }

    // 3) 상태 비네트: 빈사(심장 박동) · 피격(방향) · EMP · 과열
    if (this.lowK > 0.01) this._layer(g, im.vigRed, Math.sqrt(this.lowK) * (0.2 + 0.4 * this.beatA) * F, W, H);
    if (this.hurtA > 0.01) {
      const a = this.hurtA * 0.62 * F, b = this.hurtBias;
      this._layer(g, im.vigRed, a * (1 - 0.5 * b), W, H);
      if (b > 0.05) this._side(g, im.sideRed, a * b, this.hurtAng, W, H);
    }
    if (this.stunA > 0.01) this._layer(g, im.vigBlue, this.stunA * (0.5 + 0.06 * Math.sin(t * 19)) * F, W, H);
    if (this.heatA > 0.01) this._side(g, im.sideOrange, this.heatA * (0.34 + 0.1 * Math.sin(t * 9)) * F, Math.PI / 2, W, H);

    // 4) 테두리: 미사일 경보 · 부스터 · 과충전 · 짧은 번쩍임
    if (this.warnA > 0.01) this._layer(g, im.frameRed, this.warnA * (0.2 + 0.5 * (0.5 - 0.5 * Math.cos(this.warnPh * 6.2832))) * F, W, H);
    if (this.boostK > 0.01) this._layer(g, im.thinYellow, this.boostK * 0.3 * F, W, H);
    if (this.overK > 0.01) this._layer(g, im.thinMagenta, this.overK * (0.2 + 0.06 * Math.sin(t * 7)) * F, W, H);
    for (const f of this.slots) if (f.a > 0.004 && f.img) this._layer(g, f.img, f.a * F, W, H);

    // 5) 속도선: 화면 가장자리 타원 띠에서 바깥으로 흐른다
    const st = Math.min(1, this.streak + this.streakPulse);
    if (st > 0.04) {
      g.globalAlpha = Math.min(0.5, st * 0.4) * F;
      g.strokeStyle = this.boostK > 0.3 ? "#fff3b0" : "#ffffff";
      g.lineWidth = 1.7 * u; g.lineCap = "round";
      g.beginPath();
      for (let i = 0; i < 30; i++) {
        const a = hash(i * 3.7) * 6.2832, ph = (hash(i * 9.1) + t * (1.5 + hash(i * 5.3) * 1.5)) % 1;
        const r0 = 0.66 + 0.5 * ph, r1 = r0 + (0.05 + 0.14 * st) * (0.6 + ph);
        const cx = Math.cos(a) * W / 2, cy = Math.sin(a) * H / 2;
        g.moveTo(W / 2 + cx * r0, H / 2 + cy * r0); g.lineTo(W / 2 + cx * r1, H / 2 + cy * r1);
      }
      g.stroke();
      this.drawn++;
    }

    // 6) 총구 섬광 (FPV): 쏜 쪽 아래 모서리의 빛
    if (fpv && this.muzzleA > 0.02) {
      const S = H * 0.62;
      g.globalAlpha = this.muzzleA * 0.55 * F;
      g.drawImage(this.muzzleHot ? im.blobMagenta : im.blobCyan, W / 2 + this.muzzleSide * W * 0.38 - S / 2, H * 1.02 - S / 2, S, S);
      this.drawn++;
    }

    // 7) 화면 전체 번쩍임 (폭발·EMP·실드 파괴)
    if (this.fullA > 0.004) { g.globalAlpha = this.fullA * F; g.fillStyle = this.fullCol; g.fillRect(0, 0, W, H); this.drawn++; }

    g.restore();
  }

  dispose() {
    if (this.gl && this.filterStep) this.gl.style.filter = "";
    this.filterStep = 0;
    if (this.snd && this.snd.layers) this.snd.layers(0, 0);
    if (this.inp && this.inp.rumble) this.inp.rumble(0, 0, 0);
    this.sprites.clear(); this.im = null; this.pat = null;
  }
}
