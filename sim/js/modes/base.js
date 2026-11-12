// 게임 모드 공통: 카운트다운, 추락 후 재배치, 구역 이탈, 결과 처리
import * as THREE from "../../vendor/three.module.min.js";

export class Mode {
  constructor(session, cfg) {
    this.s = session;
    this.cfg = cfg;
    this.time = 0;                 // 진행 시간(카운트다운 제외)
    this.state = "countdown";      // countdown | run | done
    this.count = 3.6;
    this._lastBeep = 4;
    this.result = null;
    this.respawnDelay = 1.5;
    this.combat = null;
    this.title = "";
  }

  get locked() { return this.state !== "run"; }

  // 월드 생성 직후 호출. 플레이어 시작 위치를 정한다
  start() {
    const sp = this.s.map.spawn || { pos: [0, 0.3, 0], yaw: 0 };
    this.placePlayer(new THREE.Vector3(...sp.pos), (sp.yaw || 0) * Math.PI / 180);
  }

  placePlayer(pos, yaw) {
    const w = this.s.world, p = pos.clone();
    const gy = w.h(p.x, p.z) + this.s.player.body.radius + 0.05;
    if (p.y < gy) p.y = gy;
    this.s.player.setSpawn(p, yaw);
    this.s.player.respawn();
  }

  respawnPoint() { return this.s.player.spawn; }

  physicsStep() {}

  // 충돌: 세게 부딪히면 추락 처리
  onImpact(impact, hard) { if (hard && this.state === "run") this.s.player.breakUp(); }

  onReset() {
    const r = this.respawnPoint();
    this.s.player.respawn(r.pos, r.yaw);
  }

  update(dt) {
    const s = this.s, pl = s.player, b = pl.body;
    if (this.state === "countdown") {
      this.count -= dt;
      const n = Math.ceil(this.count);
      if (n < this._lastBeep && n >= 1 && n <= 3) { this._lastBeep = n; s.game.sound.play("beep"); }
      if (this.count <= 0) { this.state = "run"; s.game.sound.play("go"); s.hud.toast("GO!", "#35ff7a", 0.9, 54); this.onGo(); }
      return;
    }
    if (this.state === "run") this.time += dt;
    // 추락 → 잠시 후 재배치
    if (pl.crashed && pl.crashTimer > this.respawnDelay) this.onReset();
    // 구역 이탈
    const R = s.world.size + 40;
    if (Math.abs(b.pos.x) > R || Math.abs(b.pos.z) > R || b.pos.y > s.world.ceiling + 40 || b.pos.y < s.world.h(b.pos.x, b.pos.z) - 5) {
      this.onOutOfBounds();
    }
  }

  onOutOfBounds() {
    this.s.hud.toast("신호 끊김 — 재배치", "#ff6b5a");
    this.onReset();
  }

  onGo() {}

  // HUD 에 알려 줄 현재 목표(거리계·나침반·레이더가 사용): { pos: Vector3, label, color, dist?, pill? } 또는 null
  hudObjective() { return null; }

  // 카운트다운 숫자 (숫자가 바뀔 때마다 튀어나오듯)
  hudCountdown(h) {
    if (this.state !== "countdown") return;
    const n = Math.ceil(this.count), g = h.g;
    if (n >= 1 && n <= 3) {
      const f = n - this.count, sc = 1 + Math.max(0, 0.22 - f) * 2.6;
      g.save(); g.translate(h.W / 2, h.H * 0.4); g.scale(sc, sc);
      h.text(String(n), 0, 0, { size: 104, align: "center", base: "middle", color: n === 1 ? "#ff8a2a" : "#ffd24a" });
      g.restore();
    } else if (n > 3) h.text("준비", h.W / 2, h.H * 0.4, { size: 46, align: "center", base: "middle", color: "#fff" });
  }

  hud() {}

  finish(result) {
    if (this.state === "done") return;
    this.state = "done";
    this.result = result;
    this.s.game.sound.play(result.win === false ? "fail" : "win");
    this.s.onFinish(result);
  }

  dispose() {}
}

// 별점: 기준값 배열 [1성, 2성, 3성] 대비 (lower=true 면 작을수록 좋음)
export function stars(value, th, lower = false) {
  let n = 0;
  for (const t of th) if (lower ? value <= t : value >= t) n++;
  return n;
}
