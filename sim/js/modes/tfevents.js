// 팀 파이트(작은 맵 팀전) 중반 이벤트: 판이 단조로워지지 않게 1분 남짓마다 새 상황을 던진다
//  · 보급 투하: 링 안에 머물러 점령하면 팀 점수 + 수리·미사일. 적 점령조도 달려든다
//  · 제3세력 출현: 양쪽 모두를 노리는 약탈단 드론. 더 많이 잡은 팀에 보너스
//  · 함대 지원전: 양 팀에 전투함 한 척씩. 상대 전투함을 격침하면 큰 점수 (내 쪽 함선은 지켜야 한다)
//  · 거대 로봇 강하: 양쪽 모두의 적인 폭주 거대로봇. 막타 친 팀이 큰 점수
import * as THREE from "../../vendor/three.module.min.js";
import { clamp } from "../config.js";

const V3 = THREE.Vector3, _v = new V3();
const rnd = (a, b) => a + Math.random() * (b - a), pick = (L) => L[Math.floor(Math.random() * L.length)];
const ROGUE = ["약탈단 까마귀", "약탈단 송곳니", "약탈단 그림자", "약탈단 독수리"];
const ICON = { supply: "📦", rogue: "☠", fleet: "⚓", mech: "⚙" };

export class TFEvents {
  constructor(mode) {
    this.m = mode; this.s = mode.s; this.c = mode.combat; this.w = mode.s.world;
    const d = mode.duration;
    // 이벤트 시각: 1:20부터 대략 1분 간격. 앞의 둘은 순서를 섞고, 끝은 늘 거대 로봇(피날레)
    const first = Math.random() < 0.5 ? ["supply", "rogue"] : ["rogue", "supply"];
    const at = [0.27, 0.48, 0.67, 0.84].map((f) => Math.round(d * f));
    this.plan = [first[0], first[1], "fleet", "mech"].map((type, i) => ({ type, at: at[i] }));
    this.ev = null; this.done = 0; this.log = [];
  }

  // 맵 가운데(양 기지 사이) 근처 지상점
  _mid(k = 0.5, side = 0) {
    const B = this.m.basePos;
    const p = B ? B[0].clone().lerp(B[1], k) : new V3();
    if (B && side) { _v.copy(B[1]).sub(B[0]).setY(0).normalize(); p.x += -_v.z * side; p.z += _v.x * side; }
    const lim = this.w.size - 30; p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim);
    p.y = this.w.h(p.x, p.z);
    return p;
  }
  _say(line) { if (this.s.radioSay) this.s.radioSay("관제", line, { prio: 3, ttl: 6, force: true }); }
  _start(type) {
    const h = this.s.hud;
    this.s.game.sound.play("warn");
    const ev = (this.ev = this["_" + type]());
    ev.type = type; ev.t = 0;
    h.toast(`${ICON[type]} ${ev.title}`, ev.col, 2.6, 30);
    this._say(ev.say);
  }
  _finish(winTeam, pts, line) {
    const ev = this.ev, h = this.s.hud;
    if (!ev) return;
    if (winTeam === 0 || winTeam === 1) { this.m.team[winTeam] += pts; h.feed(`${ev.title}: ${winTeam === 0 ? "아군" : "적군"} +${pts}`, winTeam === 0 ? "#5aa9ff" : "#ff6b5a"); }
    h.toast(line, winTeam === 0 ? "#35ff7a" : winTeam === 1 ? "#ff6b5a" : "#cfd8e3", 2.2, 24);
    this.s.game.sound.play(winTeam === 0 ? "lap" : "warn");
    if (ev.clean) ev.clean();
    this.log.push({ type: ev.type, title: ev.title, win: winTeam });
    this.done++;
    this.ev = null;
  }

  update(dt) {
    const m = this.m;
    if (m.state !== "run" || m.cut) return;
    // 다음 이벤트 시각이 되면 진행 중인 것은 정리하고 넘어간다 (피날레가 밀려 사라지지 않게)
    if (this.plan.length && m.time >= this.plan[0].at) {
      if (this.ev) this.ev.timeout();
      if (this.ev) this._finish(-1, 0, `${this.ev.title.split(" —")[0]} 종료`);
      if (m.duration - m.time > 15) this._start(this.plan.shift().type); else this.plan.shift();
    }
    const ev = this.ev;
    if (!ev) return;
    ev.t += dt;
    ev.upd(dt);
    if (this.ev && ev.limit && ev.t >= ev.limit) ev.timeout();
  }

  // ── 보급 투하 ──
  _supply() {
    const p = this._mid(rnd(0.4, 0.6), rnd(-60, 60)), r = 18, c = this.c;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.8, r, 48), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, p.y + 0.6, p.z); this.w.scene.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 120, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(p.x, p.y + 60, p.z); this.w.scene.add(beam);
    const goal = p.clone().setY(p.y + 8), cappers = [];
    for (const a of c.actors) if (a.kind === "bot" && a.alive && a.team === 1 && cappers.length < 2 && a.ai) { a.ai.path = [goal]; a.ai.pi = 0; cappers.push(a); }
    const ev = { title: "보급 투하 — 먼저 점령하라!", say: "보급 컨테이너 투하! 링 안에 머물러 먼저 점령하는 팀이 보급을 가져갑니다!", col: "#ffd24a", limit: 45, prog: [0, 0], pos: goal, label: "보급 투하" };
    ev.upd = (dt) => {
      const n = [0, 0];
      for (const a of c.actors) if (a.alive && (a.kind === "bot" || a.kind === "player") && (a.team === 0 || a.team === 1) && Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r && a.pos.y < p.y + 40) n[a.team]++;
      for (const t of [0, 1]) if (n[t] && !n[1 - t]) ev.prog[t] = Math.min(1, ev.prog[t] + dt * Math.min(2, n[t]) / 9);
      ev.contest = n[0] && n[1];
      ring.material.color.set(ev.contest ? 0xff6b5a : n[0] ? 0x35ff7a : n[1] ? 0xff5a66 : 0xffd24a);
      ring.material.opacity = 0.45 + 0.25 * Math.sin(this.s.time * 6);
      ev.text = ev.contest ? "교전 중 — 점령 정지" : `점령 아군 ${Math.round(ev.prog[0] * 100)}% · 적 ${Math.round(ev.prog[1] * 100)}%`;
      for (const t of [0, 1]) if (ev.prog[t] >= 1) {
        if (t === 0) { const me = this.m.me; if (me.alive) { c.give(me, "repair"); c.give(me, "missiles"); } }
        return this._finish(t, 600, t === 0 ? "보급 확보!  +600 · 수리 · 미사일" : "적이 보급을 가져갔습니다");
      }
    };
    ev.timeout = () => { const t = ev.prog[0] === ev.prog[1] ? -1 : ev.prog[0] > ev.prog[1] ? 0 : 1; this._finish(t, 300, t < 0 ? "보급 컨테이너 소실" : t === 0 ? "보급 일부 확보  +300" : "적이 보급 일부를 가져갔습니다"); };
    ev.clean = () => { this.w.scene.remove(ring, beam); ring.geometry.dispose(); ring.material.dispose(); beam.geometry.dispose(); beam.material.dispose(); for (const a of cappers) if (a.ai) a.ai.path = null; };
    return ev;
  }

  // ── 제3세력 출현 ──
  _rogue() {
    const c = this.c, k = Math.random() < 0.5 ? 1 : -1, list = [], kills = [0, 0];
    const side = this._mid(0.5, k * (this.w.size * 0.7));
    for (let i = 0; i < 4; i++) {
      const p = side.clone().add(new V3(rnd(-20, 20), rnd(18, 30), rnd(-20, 20)));
      const b = c.spawnBot({ kind: i === 0 ? "ace" : pick(["grunt", "ace", "kamikaze"]), team: 2, pos: p, temp: true, hpScale: i === 0 ? 1.8 : 1.1, name: ROGUE[i] });
      b.ai.home = this._mid(0.5).setY(20); b.rogue = true;
      list.push(b);
    }
    const ev = { title: "제3세력 출현 — 약탈단을 쓸어라!", say: "정체불명 약탈단 진입! 우리도 적도 가리지 않고 공격합니다. 더 많이 잡는 팀이 보너스!", col: "#c77dff", limit: 55, list, kills, label: "약탈단" };
    ev.onKill = (a, k2) => { if (a.rogue && k2 && (k2.team === 0 || k2.team === 1)) { kills[k2.team]++; this.m.team[k2.team] += 150; } };
    ev.upd = () => {
      const live = list.filter((b) => b.alive);
      ev.text = `약탈단 ${live.length}/4 · 격추 아군 ${kills[0]} : ${kills[1]} 적군`;
      if (!live.length) this._finish(kills[0] === kills[1] ? -1 : kills[0] > kills[1] ? 0 : 1, 500, kills[0] >= kills[1] ? (kills[0] > kills[1] ? "약탈단 소탕 — 아군 우세!  +500" : "약탈단 소탕 — 무승부") : "약탈단 소탕 — 적군 우세");
    };
    ev.timeout = () => { this._finish(kills[0] === kills[1] ? -1 : kills[0] > kills[1] ? 0 : 1, 300, "약탈단 철수"); };
    ev.clean = () => { for (const b of list) if (b.alive) c.removeActor(b); };
    ev.target = () => { let best = null, bd = 1e9; for (const b of list) if (b.alive) { const d = b.pos.distanceTo(this.m.me.pos); if (d < bd) { bd = d; best = b; } } return best; };
    return ev;
  }

  // ── 함대 지원전 ──
  _fleet() {
    const c = this.c, ships = [];
    for (const team of [0, 1]) {
      const p = this._mid(team ? 0.72 : 0.28, rnd(-40, 40));
      const kind = c.units.pickKind("ship"), nm = { frigate: "전투함", destroyer: "구축함" }[kind] || "전투함";
      const r = c.units.spawn(kind, { pos: p, near: true, hp: 1.5, rank: 4, name: (team ? "적 " : "아군 ") + nm });
      r.team = team; for (const q of r.unit.parts) q.team = team;
      r.name = (team ? "적 " : "아군 ") + nm; r.tfShip = team;
      r.unit.home = this._mid(team ? 0.58 : 0.42, rnd(-30, 30));
      ships.push(r);
    }
    const ev = { title: "함대 지원전 — 적 전투함을 격침하라!", say: "양측 전투함 진입! 적 전투함을 격침하고 우리 전투함을 지켜요!", col: "#5ab4ff", limit: 50, ships, label: "적 전투함" };
    ev.upd = () => {
      const [a, b] = ships;
      ev.text = `아군 ${a.name.slice(3)} ${a.alive ? Math.ceil(a.hp / a.maxHp * 100) + "%" : "격침"} · 적 함 ${b.alive ? Math.ceil(b.hp / b.maxHp * 100) + "%" : "격침"}`;
      if (!b.alive) return this._finish(0, 1200, "적 전투함 격침!  +1200");
      if (!a.alive) return this._finish(1, 1200, "아군 전투함이 격침됐습니다");
    };
    ev.timeout = () => { const [a, b] = ships, fa = a.alive ? a.hp / a.maxHp : 0, fb = b.alive ? b.hp / b.maxHp : 0; this._finish(Math.abs(fa - fb) < 0.05 ? -1 : fa > fb ? 0 : 1, 500, fa > fb ? "함대전 우세로 종료  +500" : "함대전 열세로 종료"); };
    // 이벤트가 끝나도 남은 전투함은 그대로 싸운다 (지원 화력 · 계속 노릴 수 있는 표적)
    ev.target = () => (ships[1].alive ? ships[1] : null);
    return ev;
  }

  // ── 거대 로봇 강하 ──
  _mech() {
    const c = this.c, p = this._mid(0.5, rnd(-40, 40));
    const r = c.units.spawn("mech", { pos: p, near: true, hp: 1.3, name: "폭주 거대로봇", home: p });
    r.team = 2; for (const q of r.unit.parts) q.team = 2;
    r.name = "폭주 거대로봇"; r.tfMech = true;
    this.m.bossIntro(r, r.name, "제3세력 강하 · 양쪽 모두의 적", true);
    const ev = { title: "거대 로봇 강하 — 막타를 노려라!", say: "폭주 거대로봇 강하! 막타를 치는 팀이 큰 점수를 가져갑니다!", col: "#ff3d4d", limit: 0, mech: r, label: "폭주 거대로봇" };
    ev.onKill = (a, k) => { if (a === r) { const t = k && (k.team === 0 || k.team === 1) ? k.team : -1; this._finish(t, 1500, t === 0 ? "거대로봇 격파!  +1500" : t === 1 ? "적이 거대로봇을 쓰러뜨렸습니다" : "거대로봇 붕괴"); } };
    ev.upd = () => { ev.text = `거대로봇 체력 ${Math.ceil(r.hp / r.maxHp * 100)}%`; if (!r.alive && this.ev === ev) this._finish(-1, 0, "거대로봇 붕괴"); };
    ev.timeout = () => {};
    ev.target = () => (r.alive ? r : null);
    return ev;
  }

  onKill(a, k) { if (this.ev && this.ev.onKill) this.ev.onKill(a, k); }

  // 길 따라 가는 봇(보급 점령조)
  botGoal(a) {
    const ai = a.ai;
    if (ai && ai.path) { const q = ai.path[Math.min(ai.pi || 0, ai.path.length - 1)]; if (q && Math.hypot(q.x - a.pos.x, q.z - a.pos.z) < 10) ai.pi = (ai.pi || 0) + 1; return ai.path[Math.min(ai.pi, ai.path.length - 1)]; }
    if (a.rogue && !ai.target) return ai.home;
    return null;
  }

  objective(o) {
    const ev = this.ev;
    if (!ev) return null;
    const t = ev.target ? ev.target() : null, pos = t ? t.pos : ev.pos;
    if (!pos) return null;
    o.pos = pos; o.label = t ? t.name : ev.label; o.color = ev.col;
    return o;
  }

  // 화면 위 가운데: 진행 중 이벤트 한 줄 + 다음 이벤트까지 남은 시간
  hud(h) {
    const u = h.u, L = h.L, ev = this.ev, y = L.subY + 30 * u, cx = L.cx;
    if (ev) {
      const left = ev.limit ? Math.max(0, Math.ceil(ev.limit - ev.t)) : null;
      h.plate(cx - 170 * u, y - 13 * u, 340 * u, 40 * u, { skew: 0.08, fill: "rgba(8,14,28,0.82)", accent: ev.col });
      h.text(`${ICON[ev.type]} ${ev.title}${left !== null ? `  ${left}s` : ""}`, cx, y - 1 * u, { size: 12, align: "center", base: "middle", bold: true, color: ev.col, shadow: false });
      if (ev.text) h.text(ev.text, cx, y + 15 * u, { size: 11, align: "center", base: "middle", color: "#e8f4ff", shadow: false });
    } else if (this.plan.length) {
      const n = Math.ceil(this.plan[0].at - this.m.time);
      if (n <= 10 && n > 0) h.text(`⚠ ${n}초 뒤 돌발 상황`, cx, y, { size: 12, align: "center", base: "middle", bold: true, color: "#ffd24a" });
    }
  }

  dispose() { if (this.ev && this.ev.clean) this.ev.clean(); this.ev = null; }
}
