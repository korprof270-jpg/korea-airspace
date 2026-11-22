// 임무 중 반전 사건 (스토리 임무 · 스토리 공중전): 적 증원 급습, 아군 증원 도착, 보스 2페이즈
//  · 단계 데이터는 건드리지 않는다. 단계 id 로 정한 난수로 어떤 사건이 언제 일어날지 고른다 (같은 단계는 늘 비슷하게)
//  · 균형: 적 증원은 한 번, 소규모(2~3기, 재출격 없음). 아군 증원은 고전할 때(여러 번 격추·지킬 대상 손상) 한 번, 재출격 없는 2기
//  · 보스 2페이즈: 보스·중간 보스 체력 50% 에서 짧은 경고 + 공격 간격 단축(약 30%)·속도 소폭 상승. 모든 전투 모드에 적용(온라인 제외)
import * as THREE from "../vendor/three.module.min.js";
import { settings } from "./config.js";

const _v = new THREE.Vector3();
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => () => { seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return (seed % 100000) / 100000; };

const TWIST_MISSIONS = new Set(["waves", "strike", "escort", "supply", "heist"]);

export class Drama {
  constructor(mode) {
    this.mode = mode; this.s = mode.s;
    const cfg = mode.cfg, id = String(cfg.story || "");
    this.story = !!cfg.story && !cfg.net;
    const r = rng(hash(id || "free"));
    const kind = mode.id || cfg.variant;
    this.kind = kind;
    // 적 증원: 스토리 임무 대부분(약 70%), 공중전(tdm) 절반. 보스전·거신전은 이미 호위기가 쏟아지므로 없음
    this.enemyPlan = this.story && (TWIST_MISSIONS.has(kind) ? r() < 0.7 : kind === "tdm" ? r() < 0.5 : false);
    this.enemyAt = 50 + r() * 35;                 // 초 (모드별 조건과 함께)
    this.escortU = 0.35 + r() * 0.25;             // 호송: 항로 진행률이 여기에 닿으면
    this.allyPlan = this.story && (TWIST_MISSIONS.has(kind) || kind === "tdm" || kind === "boss" || kind === "titan");
    this.allyLuck = r();
    this.enemyDone = false; this.allyDone = false;
    this.t = 0; this.pending = [];
    const main = id.startsWith("c");
    this.ctrl = main ? "윤채아" : id.startsWith("e") ? "한서윤" : null;
    // 증원 동료: 본편은 청동 편대(루카가 편대에 없으면 루카가 직접), 히든은 방위 드론
    const wing = cfg.wing || [];
    this.allyNames = main ? (wing.includes("루카") ? ["청동 2", "청동 3"] : ["루카", "청동 2"]) : id.startsWith("e") ? ["방위 드론 7", "방위 드론 8"] : ["에일 이탈자 1", "에일 이탈자 2"];
  }

  // 지금 사건을 벌여도 되는지 (컷신·결과·보스 등장 직전이 아닐 때)
  _calm() {
    const m = this.mode;
    return m.state === "run" && !m.cut && !(m.winT > 0) && !(m.failT > 0) && !(m.endT > 0);
  }

  _say(who, line, prio = 2) { if (who && this.s.radioSay) this.s.radioSay(who, line, { prio, ttl: 8, force: prio >= 3 }); }

  update(dt) {
    const m = this.mode;
    if (this.s.cfg.net) return;
    this._bossPhase(dt);
    if (!this.story || !this._calm()) return;
    this.t += dt;
    // 예고 후 도착 (경고 → 몇 초 뒤 실제 투입)
    for (let i = this.pending.length - 1; i >= 0; i--) { const p = this.pending[i]; if ((p.t -= dt) <= 0) { this.pending.splice(i, 1); p.f(); } }
    if (this.enemyPlan && !this.enemyDone && this._enemyReady()) { this.enemyDone = true; this._enemyTwist(); }
    if (this.allyPlan && !this.allyDone && this._allyReady()) { this.allyDone = true; this._allyTwist(); }
    void m;
  }

  // ── 적 증원 ──
  _enemyReady() {
    const m = this.mode, t = m.time;
    if (t < (this.kind === "escort" ? 25 : this.enemyAt)) return false;
    switch (this.kind) {
      case "waves": return !m.pending && m.wave >= 2 && m.wave < m.waves && m.enemies().length > 0;
      case "escort": { const u = m.mover ? m.mover.s / m.mover.length : 0; return u > this.escortU && u < 0.82; }
      case "strike": case "supply": case "heist": return !m.limit || t < m.limit - 70;
      case "tdm": return t >= m.duration * 0.42 && t < m.duration - 40;
    }
    return false;
  }
  _enemyTwist() {
    const m = this.mode, s = this.s, c = m.combat, me = m.me;
    // 어디서 오나: 지킬 대상(코어·수송함)이나 나에게서 먼 바깥쪽
    const guard = m.truck && m.truck.alive ? m.truck.pos : m.base && m.base.core.alive ? m.base.core.pos : me.pos;
    const q = m.outerPoint ? m.outerPoint(guard, 170) : (() => { const p = m.basePos ? m.basePos[1] : c.randomPoint(3, 5, 0.7); return { x: p.x, z: p.z }; })();
    const side = m.sideOf ? m.sideOf(q.x, q.z) : "";
    s.hud.toast(`⚠ 적 증원 접근${side ? ` — ${side}` : ""}`, "#ff6b5a", 2.2, 26);
    s.hud.feed("적 증원 편대 포착", "#ff8a8a");
    s.game.sound.play("warn");
    const ctrl = this.ctrl || (m.cfg.wing || [])[0];
    this._say(ctrl, side ? `적 증원 편대 포착! ${side} 방향이에요!` : "적 증원 편대 포착! 대비하세요!", 3);
    const scale = m.scale || 1, n = Math.max(2, Math.min(3, Math.round(2 * scale)));
    const focus = this.kind === "escort" ? "truck" : this.kind === "waves" ? "core" : null;
    this.pending.push({ t: 4, f: () => {
      if (m.state !== "run") return;
      if (m.spawnGroup) m.spawnGroup(q.x, q.z, 24, [["grunt", n - 1, focus], ["ace", 1, null]], { lo: 18, hi: 34 });
      else for (let i = 0; i < n; i++) {      // 공중전: 재출격 없는 적기
        const b = c.spawnBot({ kind: i ? "grunt" : "ace", team: 1, respawns: false, hpScale: 1.2 });
        b.pos.copy(c.randomPoint(18, 30, 0, q.x, q.z, 25)); b.model.position.copy(b.pos);
      }
      s.hud.toast("적 증원 도착!", "#ff8a5a", 1.4, 22);
    } });
  }

  // ── 아군 증원: 고전할 때 한 번 ──
  _allyReady() {
    const m = this.mode, me = m.me, t = m.time;
    if (t < 35) return false;
    const deaths = me.deaths || 0;
    if (deaths >= 2) return true;
    if (m.truck && m.truck.alive && m.truck.hp / m.truck.maxHp < 0.45) return true;
    if (m.base && m.base.core.alive && m.base.core.hp / m.base.core.maxHp < 0.45) return true;
    if (this.kind === "tdm" && t > m.duration * 0.55 && m.team && m.team[0] < m.team[1] * 0.85) return true;
    // 적 증원 뒤 한참 지나면, 단계에 따라 아군도 온다 (절반 정도)
    if (this.enemyDone && this.allyLuck < 0.5 && t > this.enemyAt + 30) return true;
    return false;
  }
  _allyTwist() {
    const m = this.mode, s = this.s, c = m.combat, me = m.me;
    const names = this.allyNames, lead = names[0];
    s.hud.toast("아군 증원 도착!", "#5aa9ff", 2, 26);
    s.hud.feed(`${names.join(" · ")} 합류`, "#8cc4ff");
    s.game.sound.play("lap", 0.7);
    if (lead === "루카") this._say("루카", "청동 편대 루카, 합류한다! 버텨 줘서 고맙다.", 3);
    else this._say(this.ctrl || (m.cfg.wing || [])[0], lead.startsWith("청동") ? "아군 증원 도착! 청동 편대가 합류합니다!" : `아군 증원 도착! ${lead} 합류합니다!`, 3);
    // 내 뒤쪽 하늘에서 날아든다
    const hd = s.player.body.heading;
    _v.set(me.pos.x + Math.sin(hd) * 60, 0, me.pos.z + Math.cos(hd) * 60);
    for (let i = 0; i < names.length; i++) {
      const b = c.spawnBot({ kind: "ace", team: me.team, respawns: false, hpScale: 1.2, leader: me, slot: 4 + i, name: names[i] });
      const p = c.randomPoint(14, 22, 0, _v.x, _v.z, 12);
      b.pos.copy(p); b.model.position.copy(b.pos);
      s.fx.ring(b.pos, 0x7fc4ff, 4, 0.4);
    }
    if (m.chatter) m.chatter.extra = names.filter((n) => n === "루카");
  }

  // ── 보스 2페이즈: 체력 50% ──
  _bossPhase(dt) {
    const m = this.mode, c = m.combat;
    if (!c || m.state !== "run") return;
    if ((this._scan = (this._scan || 0) - dt) <= 0) { this._scan = 0.25; this.bosses = c.actors.filter((a) => a.bossBar && a.alive && a.team !== m.me.team); }
    for (const a of this.bosses || []) {
      if (!a.alive) continue;
      if (!a.phase2) {
        if (m.cut || a.hp / a.maxHp > 0.5) continue;
        a.phase2 = true;
        const s = this.s, mid = a.bossBar.mid;
        s.hud.toast(`${a.bossBar.name || a.name} — 2페이즈!`, mid ? "#ffb02e" : "#ff4a5a", 2.2, 28);
        s.hud.feed(`${a.bossBar.name || a.name}: 공격 패턴 변화`, "#ff8a8a");
        s.game.sound.play("warn"); s.game.sound.play("bigkill", 0.4);
        s.feel.flash("255,61,77", 0.4, 2.2, "vig");
        if (!(settings.fx && settings.fx.reduceMotion)) { s.feel.addTrauma(0.25); s.feel.fovPunch -= 2.5; }
        s.fx.ring(a.pos, 0xff4a5a, (a.radius || 2) * 3 + 8, 0.6);
        if (a.ai && a.K) a.K = Object.assign({}, a.K, { speed: a.K.speed * 1.15, accel: a.K.accel * 1.15 });
        if (m.chatter) m.chatter.say("phase2", 999, 3);
        continue;
      }
      // 공격이 빨라진다: 재사용 대기 시간을 30% 더 빨리 줄인다 (드론형은 ai, 대형 유닛은 부위 무기 cool)
      if (m.cut) continue;
      const k = dt * 0.3;
      if (a.ai) { a.ai.cool -= k; a.ai.mcool -= k * 0.8; }
      const u = a.unit;
      if (u && u.cool && u.root === a) for (const key in u.cool) u.cool[key] -= k;
    }
  }
}
