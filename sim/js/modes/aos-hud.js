// 기지전 HUD: 위쪽 팀 점수·타워 수, 왼쪽 내 포인트·강화·부품, 오른쪽 아래 전장 지도(라인·타워·캠프·코어), 목표 알림, 격추 정보, 규칙 카드
// + 정비 패드 업그레이드 판 (DOM: 클릭·터치, 키보드 [Q] 고르기 · [E] 강화)
import { drawCombatHud } from "../combathud.js";
import { TEAM_CSS } from "../combat.js";
import { fmtTime, clamp } from "../config.js";
import { UP, UP_KEYS, UP_MAX, PARTS, PART_KEYS } from "./aos.js";

const GOLD = "#ffd24a";

export function drawAosHud(m, h) {
  const s = m.s, me = m.me, u = h.u, L = h.L, g = h.g;
  drawCombatHud(m.combat, h, { radar: false });
  if (m.cut) return;
  m.hudCountdown(h);
  if (h.lvl === "off") return;
  const full = h.lvl === "full", left = Math.max(0, m.duration - m.time);
  h.timer(fmtTime(left), left < 60 ? "#ff6b5a" : "#fff", "#ff3ad6");
  // ── 위: 팀 점수 (격추 · 남은 타워) ──
  for (const t of m.teams) {
    const right = t.id === 1, w = 196 * u, hh = 40 * u, x = right ? L.cx + 94 * u : L.cx - 94 * u - w, y = L.t;
    h.plate(x, y, w, hh, { accent: t.css, side: right ? "right" : "left", skew: 0.16 });
    const tx = right ? x + w - 18 * u : x + 18 * u, al = right ? "right" : "left";
    h.text(t.name + (t.id === me.team && !m.spectator ? " (아군)" : ""), tx, y + 14 * u, { size: 11, align: al, base: "middle", color: t.css, shadow: false });
    h.text(`⚔ ${t.kills}`, right ? x + 30 * u : x + w - 30 * u, y + 21 * u, { size: 22, align: right ? "left" : "right", base: "middle", mono: true, shadow: false });
    // 타워 칸: 라인별 바깥·안쪽, 무너지면 빈칸 / 코어 마름모
    const order = ["top", "mid", "bot"];
    order.forEach((ln, i) => ["outer", "inner"].forEach((tier, j) => {
      const tw = t.towers.find((a) => a.lane === ln && a.tier === tier), k = i * 2 + j;
      const bx = right ? tx - (k * 11 + 10) * u : tx + k * 11 * u + (i * 3) * u, by = y + 25 * u;
      g.fillStyle = tw.alive ? t.css : "rgba(90,100,120,0.5)"; g.fillRect(right ? bx - i * 3 * u : bx, by, 8 * u, 9 * u);
      if (tw.alive && tw.hp < tw.maxHp) { g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(right ? bx - i * 3 * u : bx, by, 8 * u, 9 * u * (1 - tw.hp / tw.maxHp)); }
    }));
    const cx0 = right ? tx - 82 * u : tx + 82 * u, cy0 = y + 29.5 * u, r = 5 * u;
    g.beginPath(); g.moveTo(cx0, cy0 - r); g.lineTo(cx0 + r, cy0); g.lineTo(cx0, cy0 + r); g.lineTo(cx0 - r, cy0); g.closePath();
    h.fill2(t.core.invulnerable ? "#7d8aa3" : t.core.alive ? "#ffffff" : "#33394a", 1.5);
    if (t.buffT > 0) h.text(`보스 강화 ${Math.ceil(t.buffT)}초`, right ? x + w - 18 * u : x + 18 * u, y + hh + 12 * u, { size: 11, align: al, color: "#ff8ae6" });
  }
  // ── 목표 알림 ──
  if (m.hint) {
    const k = m.hint, a = Math.min(1, k.t * 2, (k.dur - k.t) * 6 + 0.4), pul = 1 + Math.sin(s.time * 8) * 0.04;
    h.fade(a); g.save(); g.translate(L.cx, L.t + 66 * u); g.scale(pul, pul);
    h.text(k.txt, 0, 0, { size: 17, align: "center", base: "middle", color: k.col });
    g.restore(); h.fade(1);
    if (k.pos && me.alive) h.marker(k.pos, s.camera, k.col, "", k.pos.distanceTo(me.pos));
  }
  if (!m.spectator) myPanel(m, h, full);
  minimap(m, h);
  // 보스·적 코어 표시
  if (me.alive && m.boss && m.boss.alive) h.marker(m.boss.pos, s.camera, "#ff4ad6", "중앙 보스", m.boss.pos.distanceTo(me.pos));
  // 격추 정보
  if (!me.alive && !m.spectator && me.aos.killedBy) h.text(`${me.aos.killedBy}에게 격추됨 · 기지에서 업그레이드하고 다시 나가세요`, L.cx, h.H * 0.4 + 36 * u, { size: 14, align: "center", color: "#ffb4a8" });
  // 기지 안 안내 (상점 판은 DOM)
  if (me.alive && !m.spectator && m.inBase(me) && me.hp < me.maxHp) h.text(m.onPad(me) ? "정비 패드 · 회복 중 ✚" : "정비 패드(초록 원) 위에서 빠르게 회복합니다", L.cx, h.H * 0.66, { size: 14, align: "center", color: "#8cff4a" });
  else if (me.alive && !m.spectator && !m.inBase(me) && me.hp < me.maxHp * 0.35) h.text(`체력 낮음 — ${h.keyName("reset", "리셋 버튼")} 기지 귀환`, L.cx, h.H * 0.66, { size: 14, align: "center", color: "#ffb02e" });
  if (m.state === "countdown" || m.ruleT > 0) ruleCard(m, h);
}

function myPanel(m, h, full) {
  const me = m.me, u = h.u, L = h.L, g = h.g, D = me.aos, x = L.l, y = L.t, w = 214 * u, rows = UP_KEYS.length;
  const owned = PART_KEYS.filter((p) => D.parts[p]);
  const ph = 40 * u + rows * 17 * u + (owned.length ? 24 * u : 0);
  h.plate(x, y, w, ph, { accent: GOLD, skew: 0.04 });
  h.text("전장 포인트", x + 14 * u, y + 15 * u, { size: 11, base: "middle", color: "#b4c2d4", shadow: false });
  h.text(`${Math.floor(D.pts)}ⓟ`, x + w - 14 * u, y + 17 * u, { size: 20, align: "right", base: "middle", mono: true, color: GOLD, shadow: false });
  UP_KEYS.forEach((k, i) => {
    const U = UP[k], lv = D.up[k], yy = y + 40 * u + i * 17 * u;
    h.text(`${U.icon} ${U.name}`, x + 14 * u, yy, { size: 12, base: "middle", color: U.color, shadow: false });
    for (let p = 0; p < UP_MAX; p++) { g.fillStyle = p < lv ? U.color : "rgba(90,100,120,0.45)"; g.fillRect(x + 76 * u + p * 13 * u, yy - 4 * u, 10 * u, 8 * u); }
    h.text(lv ? `+${U.per * lv}%` : "", x + w - 14 * u, yy, { size: 11, align: "right", base: "middle", mono: true, color: "#dfe7f5", shadow: false });
  });
  if (owned.length) owned.forEach((p, i) => {
    const P = PARTS[p], cx = x + 22 * u + i * 26 * u, cy = y + ph - 13 * u;
    g.beginPath(); g.arc(cx, cy, 10 * u, 0, 7); g.fillStyle = "rgba(10,16,30,0.9)"; g.fill(); g.lineWidth = 2 * u; g.strokeStyle = P.color; g.stroke();
    h.text(P.icon, cx, cy + 1 * u, { size: 12, align: "center", base: "middle", color: P.color, shadow: false });
  });
  if (full && owned.length) h.text(owned.map((p) => PARTS[p].name).join(" · "), x + 6 * u, y + ph + 13 * u, { size: 10, color: "#b4c2d4" });
}

// 전장 지도: 북쪽 위 고정. 청 기지 왼쪽 아래, 홍 기지 오른쪽 위
function minimap(m, h) {
  const u = h.u, L = h.L, g = h.g, me = m.me, A = m.A, S = clamp(176 * u, 120, 230), half = 470;
  const x0 = L.touch ? L.radarX + L.radarR - S : L.r - S, y0 = L.touch ? L.radarY - L.radarR : L.b - S;
  const P = (x, z) => [x0 + (x / half + 1) / 2 * S, y0 + (z / half + 1) / 2 * S], k = S / (half * 2);
  g.save();
  h.panel(x0, y0, S, S, "rgba(8,12,26,0.78)", 8);
  g.beginPath(); g.rect(x0, y0, S, S); g.clip();
  // 라인
  g.lineCap = "round"; g.lineJoin = "round";
  for (const pts of Object.values(A.lanes)) { g.beginPath(); pts.forEach(([x, z], i) => { const [px, py] = P(x, z); if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.lineWidth = 6 * u; g.strokeStyle = "rgba(63,240,255,0.18)"; g.stroke(); g.lineWidth = 1.5 * u; g.strokeStyle = "rgba(63,240,255,0.55)"; g.stroke(); }
  // 강 · 보스 구덩이
  { const [ax, ay] = P(-470, -470), [bx, by] = P(470, 470); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineWidth = 1 * u; g.strokeStyle = "rgba(160,120,255,0.25)"; g.stroke(); }
  { const [cx, cy] = P(0, 0); g.beginPath(); g.arc(cx, cy, A.pit.r1 * k, 0, 7); g.fillStyle = m.boss && m.boss.alive ? "rgba(255,74,214,0.45)" : "rgba(120,60,140,0.3)"; g.fill(); if (m.boss && m.boss.alive) h.text("☠", cx, cy + 1 * u, { size: 12, align: "center", base: "middle", color: "#ffd0f4", shadow: false }); }
  // 기지
  for (const t of m.teams) {
    const [cx, cy] = P(t.base.x, t.base.z);
    g.beginPath(); g.arc(cx, cy, A.baseR * k, 0, 7); g.fillStyle = t.id ? "rgba(255,45,61,0.25)" : "rgba(47,140,255,0.25)"; g.fill();
    g.lineWidth = 1.5 * u; g.strokeStyle = t.css; g.stroke();
    const r = 5 * u; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy); g.closePath();
    h.fill2(t.core.alive ? (t.core.invulnerable ? "#9aa6bd" : "#ffffff") : "#333", 1.2);
  }
  // 캠프 · 상자(가까운 것만)
  for (const cp of m.camps) { const [cx, cy] = P(cp.home.x, cp.home.z); g.beginPath(); g.arc(cx, cy, (cp.d.big ? 3.4 : 2.6) * u, 0, 7); g.fillStyle = cp.alive ? (cp.d.big ? "#ffb040" : "#b48cff") : "rgba(110,110,130,0.5)"; g.fill(); }
  for (const kc of m.caches) if (kc.active && kc.pos.distanceTo(me.pos) < 120) { const [cx, cy] = P(kc.pos.x, kc.pos.z); g.beginPath(); g.rect(cx - 2.5 * u, cy - 2.5 * u, 5 * u, 5 * u); g.fillStyle = GOLD; g.fill(); }
  // 타워
  for (const a of m.towers) {
    const [cx, cy] = P(a.pos.x, a.pos.z), r = 3.6 * u;
    g.beginPath(); g.rect(cx - r, cy - r, r * 2, r * 2);
    if (a.alive) h.fill2(TEAM_CSS[a.team], 1.2); else { g.lineWidth = 1 * u; g.strokeStyle = "rgba(140,150,170,0.6)"; g.stroke(); }
  }
  // 미니언 · 드론 (적 드론은 아군 근처에 있을 때만)
  const seen = (o) => o.team === me.team || m.heroes.some((f) => f.team === me.team && f.alive && f.pos.distanceTo(o.pos) < 160) || m.minions.some((f) => f.team === me.team && f.alive && f.pos.distanceTo(o.pos) < 90);
  for (const a of m.minions) if (a.alive) { const [cx, cy] = P(a.pos.x, a.pos.z); g.fillStyle = TEAM_CSS[a.team]; g.fillRect(cx - 1.2 * u, cy - 1.2 * u, 2.4 * u, 2.4 * u); }
  for (const a of m.heroes) {
    if (!a.alive || a === me || a.targetable === false || (!m.spectator && !seen(a))) continue;
    const [cx, cy] = P(a.pos.x, a.pos.z); g.beginPath(); g.arc(cx, cy, 3.4 * u, 0, 7); h.fill2(TEAM_CSS[a.team], 1.2);
  }
  // 나
  if (me.alive && !m.spectator) {
    const [cx, cy] = P(me.pos.x, me.pos.z), yaw = m.s.player.body.heading, r = 6 * u;
    g.save(); g.translate(cx, cy); g.rotate(-yaw);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.75, r * 0.8); g.lineTo(0, r * 0.35); g.lineTo(-r * 0.75, r * 0.8); g.closePath();
    h.fill2("#ffffff", 1.5); g.restore();
  }
  g.restore();
  if (h.lvl === "full") h.text("전장 지도", x0 + 6 * u, y0 - 5 * u, { size: 10, color: "#9aa8bc" });
}

function ruleCard(m, h) {
  const u = h.u, L = h.L, w = Math.min(520 * u, h.W - 32 * u), x = L.cx - w / 2, y = h.H * 0.33, lh = 24 * u;
  const a = m.state === "countdown" ? 1 : Math.min(1, m.ruleT);
  h.fade(a);
  h.plate(x, y, w, 46 * u + lh * 3, { accent: "#ff3ad6", skew: 0.03 });
  h.text("기지전 — 이렇게 이깁니다", x + 18 * u, y + 20 * u, { size: 14, base: "middle", color: "#ff8ae6", shadow: false });
  const lines = ["1. 미니언과 함께 라인을 밀어 타워를 부수세요", "2. 정글 몬스터 · 숨겨진 상자로 포인트(ⓟ)를 모으세요", "3. 기지에서 업그레이드 → 적 코어 파괴!"];
  lines.forEach((t, i) => h.text(t, x + 22 * u, y + 46 * u + i * lh, { size: 14, base: "middle", color: "#fff", shadow: false }));
  h.fade(1);
}

// ── 정비 패드 업그레이드 판 (DOM) ──
export class AosShop {
  constructor(m) {
    this.m = m; this.sel = 0; this.open = false;
    const el = (this.el = document.createElement("div"));
    el.style.cssText = "position:fixed;left:max(14px,env(safe-area-inset-left));bottom:150px;z-index:30;display:none;width:340px;max-width:calc(100vw - 28px);padding:10px 12px;border-radius:12px;background:rgba(8,12,26,0.9);border:2px solid #8cff4a;color:#fff;font:600 13px 'Noto Sans KR',sans-serif;box-shadow:0 0 18px rgba(140,255,74,0.35);pointer-events:auto;user-select:none";
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="color:#8cff4a">정비 패드 · 업그레이드</b><b data-pts style="color:${GOLD};font-size:16px"></b></div>
      ${UP_KEYS.map((k, i) => `<button data-up="${k}" data-i="${i}" style="display:flex;width:100%;align-items:center;gap:8px;margin:3px 0;padding:6px 8px;border-radius:8px;border:1px solid #2a3348;background:#121a2e;color:#fff;font:inherit;cursor:pointer;text-align:left">
        <span style="color:${UP[k].color};width:62px">${UP[k].icon} ${UP[k].name}</span><span data-lv style="letter-spacing:2px;width:66px"></span><span data-nx style="flex:1;color:#cfd8e6;font-size:12px"></span><b data-cost style="color:${GOLD}"></b></button>`).join("")}
      <div data-help style="margin-top:4px;font-size:11px;color:#9aa8bc"></div>`;
    document.body.appendChild(el);
    el.addEventListener("pointerdown", (e) => { const b = e.target.closest("button[data-up]"); if (!b) return; e.preventDefault(); e.stopPropagation(); this.sel = +b.dataset.i; this.m.wantBuy(b.dataset.up); this._draw(true); });
  }
  update() {
    const m = this.m, me = m.me, inp = m.s.game.input, want = me.alive && m.inBase(me) && m.state === "run" && m.s.game.state !== "pause";
    if (want !== this.open) { this.open = want; this.el.style.display = want ? "block" : "none"; if (want) this._draw(true); }
    if (!want) return;
    // 기지 안에서는 아이템 키가 상점 조작: [Q] 고르기 · [E] 강화 (전투 시스템보다 먼저 가져간다)
    if (inp.take("itemNext")) { this.sel = (this.sel + 1) % UP_KEYS.length; m.s.game.sound.play("click"); }
    if (inp.take("item")) { if (!m.wantBuy(UP_KEYS[this.sel])) m.s.game.sound.play("click"); }
    this._draw();
  }
  _draw(force) {
    const me = this.m.me, D = me.aos, key = `${Math.floor(D.pts)}|${UP_KEYS.map((k) => D.up[k]).join("")}|${this.sel}`;
    if (!force && key === this._key) return;
    this._key = key;
    this.el.querySelector("[data-pts]").textContent = `${Math.floor(D.pts)}ⓟ`;
    for (const b of this.el.querySelectorAll("button[data-up]")) {
      const k = b.dataset.up, U = UP[k], lv = D.up[k], c = this.m.cost(me, k), can = D.pts >= c;
      b.querySelector("[data-lv]").textContent = "■".repeat(lv) + "□".repeat(UP_MAX - lv);
      b.querySelector("[data-nx]").textContent = lv >= UP_MAX ? `최대 +${U.per * lv}${U.unit}` : `+${U.per * lv}% → +${U.per * (lv + 1)}${U.unit}`;
      b.querySelector("[data-cost]").textContent = lv >= UP_MAX ? "MAX" : `${c}ⓟ`;
      b.style.opacity = lv >= UP_MAX || can ? "1" : "0.55";
      b.style.borderColor = +b.dataset.i === this.sel ? "#8cff4a" : "#2a3348";
    }
    const touch = this.m.combat.touchUI();
    this.el.querySelector("[data-help]").textContent = touch ? "칸을 눌러 강화 · 정비 패드 위에서는 체력이 빠르게 찹니다" : `클릭하거나 [${this.m.s.game.input.glyph ? this.m.s.game.input.glyph("itemNext") : "Q"}] 고르기 · [${this.m.s.game.input.glyph ? this.m.s.game.input.glyph("item") : "E"}] 강화 · 정비 패드 위에서는 체력이 빠르게 찹니다`;
  }
  dispose() { this.el.remove(); }
}
