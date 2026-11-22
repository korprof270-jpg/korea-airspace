// 기지전 HUD: 위쪽 팀 점수·타워 수, 왼쪽 내 포인트·강화·부품, 오른쪽 아래 전장 지도(라인·타워·캠프·코어), 목표 알림, 격추 정보, 규칙 카드
// + 업그레이드 창 (DOM: 기지 안에서 왼쪽 위 판을 클릭·탭 / 아이템 키로 연다) · 공격받는 아군 구조물 지도 경보
import { drawCombatHud } from "../combathud.js";
import { TEAM_CSS } from "../combat.js";
import { fmtTime, clamp } from "../config.js";
import { UP, UP_KEYS, UP_MAX, PARTS, PART_KEYS } from "./aos.js";

const GOLD = "#ffd24a";

export function drawAosHud(m, h) {
  const s = m.s, me = m.me, u = h.u, L = h.L, g = h.g;
  m.hudN = (m.hudN || 0) + 1;
  drawCombatHud(m.combat, h, { radar: false });
  if (m.cut) return;
  m.hudCountdown(h);
  if (h.lvl === "off") return;
  const full = h.lvl === "full", left = Math.max(0, m.duration - m.time);
  h.timer(fmtTime(left), left < 60 ? "#ff6b5a" : "#fff", "#ff3ad6");
  // 타이머 밑: 목표 전장 점수 (먼저 닿는 팀이 승리)
  { const near = Math.max(...m.teams.map((t) => t.score)) >= m.goal - 10;
    h.text(`목표 점수 ${m.goal} · 먼저 닿으면 승리`, L.cx, L.subY + 4 * u, { size: 12.5, align: "center", base: "middle", color: near ? "#ffd24a" : "#cfd8e6" }); }
  // ── 위: 팀 전장 점수 (큰 숫자) · 격추 · 남은 타워 ──
  for (const t of m.teams) {
    const right = t.id === 1, w = 196 * u, hh = 40 * u, x = right ? L.cx + 94 * u : L.cx - 94 * u - w, y = L.t;
    h.plate(x, y, w, hh, { accent: t.css, side: right ? "right" : "left", skew: 0.16 });
    const tx = right ? x + w - 18 * u : x + 18 * u, al = right ? "right" : "left";
    h.text(t.name + (t.id === me.team && !m.spectator ? " (아군)" : "") + `  ⚔${t.kills}`, tx, y + 14 * u, { size: 11, align: al, base: "middle", color: t.css, shadow: false });
    h.text(`${t.score}`, right ? x + 30 * u : x + w - 30 * u, y + 20 * u, { size: 24, align: right ? "left" : "right", base: "middle", mono: true, color: t.score >= m.goal - 10 ? GOLD : "#fff", shadow: false });
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
    // 코어 체력 줄 (판 아래쪽)
    { const bw = w - 44 * u, bx = right ? x + 26 * u : x + 18 * u, by = y + hh - 4.5 * u, k = clamp(t.core.alive ? t.core.hp / t.core.maxHp : 0, 0, 1);
      g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(bx, by, bw, 3 * u);
      g.fillStyle = t.core.invulnerable ? "#9aa6bd" : k < 0.3 ? "#ff6b5a" : t.css; g.fillRect(right ? bx + bw * (1 - k) : bx, by, bw * k, 3 * u); }
    if (t.buffT > 0) h.text(`보스 강화 ${Math.ceil(t.buffT)}초`, right ? x + w - 18 * u : x + 18 * u, y + hh + 12 * u, { size: 11, align: al, color: "#ff8ae6" });
    // 침입 경보: 아군 기지면 붉게 깜빡이는 경고, 적 기지면 작은 표시
    if (t.alarmT > 0 && t.core.alive) {
      const mine = t.id === me.team && !m.spectator, on = Math.sin(s.time * 12) > -0.3;
      if (mine || m.spectator) { if (on) h.text(`⚠ ${mine ? "기지 침입" : `${t.name} 기지 경보`} · 방어 포탑 강화 ${Math.ceil(t.alarmT)}초`, right ? x + w - 18 * u : x + 18 * u, y + hh + (t.buffT > 0 ? 26 : 12) * u, { size: 11.5, align: al, color: "#ff4a3a" }); }
      else h.text("적 기지 경보", right ? x + w - 18 * u : x + 18 * u, y + hh + (t.buffT > 0 ? 26 : 12) * u, { size: 10.5, align: al, color: "#ffb02e" });
    }
  }
  // ── 목표 알림 ──
  if (m.hint) {
    const k = m.hint, a = Math.min(1, k.t * 2, (k.dur - k.t) * 6 + 0.4), pul = 1 + Math.sin(s.time * 8) * 0.04;
    h.fade(a); g.save(); g.translate(L.cx, L.subY + 30 * u); g.scale(pul, pul);
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
  const owned = PART_KEYS.filter((p) => D.parts[p]), shop = m.shop, avail = !!(shop && shop.avail), open = !!(shop && shop.open);
  const ph = 40 * u + rows * 17 * u + (owned.length ? 24 * u : 0) + 22 * u;
  // 기지 안: 빛나는 테두리 + "눌러서 업그레이드" / 기지 밖: 흐리게 + "기지에서 업그레이드 가능"
  if (!avail) h.fade(0.62);
  if (avail) {
    const pul = 0.55 + 0.45 * Math.sin(m.s.time * 5);
    g.save(); g.shadowColor = "#8cff4a"; g.shadowBlur = (10 + pul * 12) * u;
    h.plate(x - 2 * u, y - 2 * u, w + 4 * u, ph + 4 * u, { accent: "#8cff4a", fill: `rgba(140,255,74,${0.18 + pul * 0.2})`, skew: 0.04 });
    g.restore();
  }
  h.plate(x, y, w, ph, { accent: avail ? "#8cff4a" : GOLD, skew: 0.04 });
  m.panelRect = { x, y, w, h: ph, f: m.hudN };
  h.text("전장 포인트", x + 14 * u, y + 15 * u, { size: 11, base: "middle", color: "#b4c2d4", shadow: false });
  h.text(`${Math.floor(D.pts)}ⓟ`, x + w - 14 * u, y + 17 * u, { size: 20, align: "right", base: "middle", mono: true, color: GOLD, shadow: false });
  UP_KEYS.forEach((k, i) => {
    const U = UP[k], lv = D.up[k], yy = y + 40 * u + i * 17 * u;
    h.text(`${U.icon} ${U.name}`, x + 14 * u, yy, { size: 12, base: "middle", color: U.color, shadow: false });
    for (let p = 0; p < UP_MAX; p++) { g.fillStyle = p < lv ? U.color : "rgba(90,100,120,0.45)"; g.fillRect(x + 76 * u + p * 13 * u, yy - 4 * u, 10 * u, 8 * u); }
    h.text(lv ? `+${U.per * lv}%` : "", x + w - 14 * u, yy, { size: 11, align: "right", base: "middle", mono: true, color: "#dfe7f5", shadow: false });
  });
  if (owned.length) owned.forEach((p, i) => {
    const P = PARTS[p], cx = x + 22 * u + i * 26 * u, cy = y + ph - 35 * u;
    g.beginPath(); g.arc(cx, cy, 10 * u, 0, 7); g.fillStyle = "rgba(10,16,30,0.9)"; g.fill(); g.lineWidth = 2 * u; g.strokeStyle = P.color; g.stroke();
    h.text(P.icon, cx, cy + 1 * u, { size: 12, align: "center", base: "middle", color: P.color, shadow: false });
  });
  const inp = m.s.game.input, touch = m.combat.touchUI(), key = touch ? "" : ` [${inp.device === "gamepad" ? inp.glyph("item") : "E"}]`;
  const foot = open ? "업그레이드 창 열림" : avail ? `▶ 눌러서 업그레이드${key}` : "기지에서 업그레이드 가능";
  h.text(foot, x + 14 * u, y + ph - 11 * u, { size: 11, base: "middle", color: avail ? "#8cff4a" : "#9aa8bc", shadow: false });
  if (!avail) h.fade(1);
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
  // 엄폐물 (벽·기둥·다리)
  if (A.cover) {
    g.lineCap = "butt"; g.strokeStyle = "rgba(170,185,210,0.45)";
    for (const q of A.cover) {
      if (q.k === "pillar") { const [cx, cy] = P(q.x, q.z); g.fillStyle = "rgba(170,185,210,0.55)"; g.fillRect(cx - 1.5 * u, cy - 1.5 * u, 3 * u, 3 * u); continue; }
      const ux = Math.sin(q.ry * Math.PI / 180) * q.L / 2, uz = Math.cos(q.ry * Math.PI / 180) * q.L / 2, [ax, ay] = P(q.x - ux, q.z - uz), [bx, by] = P(q.x + ux, q.z + uz);
      g.lineWidth = Math.max(1, (q.k === "deck" ? 2 : 1.2) * u); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    g.lineCap = "round";
  }
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
  // 기지 방어 포탑 (작은 세모 · 경보 중이면 붉게)
  for (const a of m.defs || []) {
    const [cx, cy] = P(a.pos.x, a.pos.z), r = 2.8 * u;
    g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r, cy + r * 0.8); g.lineTo(cx - r, cy + r * 0.8); g.closePath();
    if (a.alive) h.fill2(m.teams[a.team].alarmT > 0 ? "#ff4a3a" : TEAM_CSS[a.team], 1); else { g.lineWidth = 1 * u; g.strokeStyle = "rgba(140,150,170,0.6)"; g.stroke(); }
  }
  // 타워
  for (const a of m.towers) {
    const [cx, cy] = P(a.pos.x, a.pos.z), r = 3.6 * u;
    g.beginPath(); g.rect(cx - r, cy - r, r * 2, r * 2);
    if (a.alive) h.fill2(TEAM_CSS[a.team], 1.2); else { g.lineWidth = 1 * u; g.strokeStyle = "rgba(140,150,170,0.6)"; g.stroke(); }
  }
  // 미니드론 · 드론 (적 드론은 아군 근처에 있을 때만)
  const seen = (o) => o.team === me.team || m.heroes.some((f) => f.team === me.team && f.alive && f.pos.distanceTo(o.pos) < 160) || m.minions.some((f) => f.team === me.team && f.alive && f.pos.distanceTo(o.pos) < 90);
  for (const a of m.minions) if (a.alive) { const [cx, cy] = P(a.pos.x, a.pos.z); g.fillStyle = TEAM_CSS[a.team]; g.fillRect(cx - 1.2 * u, cy - 1.2 * u, 2.4 * u, 2.4 * u); }
  for (const a of m.heroes) {
    if (!a.alive || a === me || a.targetable === false || (!m.spectator && !seen(a))) continue;
    const [cx, cy] = P(a.pos.x, a.pos.z); g.beginPath(); g.arc(cx, cy, 3.4 * u, 0, 7); h.fill2(TEAM_CSS[a.team], 1.2);
  }
  // 공격받는 아군 구조물: 붉게 고동치는 경보 고리 (약 4초)
  for (const al of m.mapAlerts || []) {
    const [cx, cy] = P(al.x, al.z), k = al.t / al.dur, ph = (m.s.time * 2.2) % 1;
    g.globalAlpha = h.opacity * Math.min(1, k * 3);
    if (al.base) {   // 기지 침입: 기지 원 전체가 붉게 고동친다
      const R = A.baseR * (S / 940);
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fillStyle = `rgba(255,40,30,${0.25 + 0.25 * Math.sin(m.s.time * 10)})`; g.fill();
      for (const f of [ph, (ph + 0.5) % 1]) { g.beginPath(); g.arc(cx, cy, R * (0.8 + f * 0.9), 0, 7); g.lineWidth = 2 * u; g.strokeStyle = `rgba(255,60,50,${(1 - f) * 0.95})`; g.stroke(); }
      h.text("침입!", cx, cy - R - 6 * u, { size: 10, align: "center", base: "middle", color: "#ff6b5a", shadow: false });
      g.globalAlpha = h.opacity;
      continue;
    }
    for (const f of [ph, (ph + 0.5) % 1]) { g.beginPath(); g.arc(cx, cy, (5 + f * (al.core ? 14 : 10)) * u, 0, 7); g.lineWidth = 2 * u; g.strokeStyle = `rgba(255,60,50,${(1 - f) * 0.95})`; g.stroke(); }
    g.beginPath(); g.arc(cx, cy, 3.2 * u, 0, 7); g.fillStyle = "#ff3a30"; g.fill();
    h.text("!", cx, cy - 9 * u, { size: 11, align: "center", base: "middle", color: "#ff6b5a", shadow: false });
    g.globalAlpha = h.opacity;
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
  const lines = [["승리 조건 (셋 중 하나)", "#ffd24a"], ["① 적 본진(코어) 파괴 — 즉시 승리", "#fff"], [`② 팀 전장 점수 ${m.goal}점 먼저 달성 — 즉시 승리`, "#fff"], ["③ 시간 종료 — 전장 점수가 높은 팀 승리", "#fff"],
    ["전장 점수: 격추 +1 · 타워 +5 · 방어 포탑 +3 · 보스 +5 · 감시자 캠프 +2", "#9fe8ff"], ["ⓟ(감시자·상자·미니드론)로 기지에서 업그레이드 · 적 기지는 방어 포탑부터", "#b4c2d4"]];
  h.plate(x, y, w, 40 * u + lh * lines.length, { accent: "#ff3ad6", skew: 0.03 });
  h.text("기지전 — 이렇게 이깁니다", x + 18 * u, y + 20 * u, { size: 14, base: "middle", color: "#ff8ae6", shadow: false });
  lines.forEach(([t, c], i) => h.text(t, x + 22 * u, y + 44 * u + i * lh, { size: i >= 4 ? 12 : 14, base: "middle", color: c, shadow: false }));
  h.fade(1);
}

// ── 업그레이드 창 (DOM) ──
// 여는 길: 기지 안에서 왼쪽 위 전장 포인트 판을 클릭·탭, 또는 아이템 키 / [B]. 기지 밖에서는 판이 흐려지고 열리지 않는다
// 창 안: 칸 클릭·탭 = 강화 · 게임패드 십자키 위아래 + 확인 = 강화, 뒤로 = 닫기 · 키보드 [Q] 고르기 · [E] 강화 · [B] 닫기
export class AosShop {
  constructor(m) {
    this.m = m; this.sel = 0; this.open = false; this.avail = false;
    const el = (this.el = document.createElement("div"));
    el.className = "aos-shop";
    el.style.cssText = "position:fixed;left:max(14px,env(safe-area-inset-left));top:170px;z-index:31;display:none;width:400px;max-width:calc(100vw - 28px);padding:10px 12px 12px;border-radius:12px;background:rgba(8,12,26,0.94);border:2px solid #8cff4a;color:#fff;font:600 13px 'Noto Sans KR',sans-serif;box-shadow:0 0 22px rgba(140,255,74,0.4);pointer-events:auto;user-select:none;touch-action:manipulation";
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><b style="color:#8cff4a">기지 정비 · 업그레이드</b><b data-pts style="color:${GOLD};font-size:16px;margin-left:auto"></b>
        <button data-close aria-label="닫기" style="width:34px;height:30px;border-radius:8px;border:1px solid #3a4560;background:#1a2238;color:#fff;font:inherit;font-size:15px;cursor:pointer">✕</button></div>
      ${UP_KEYS.map((k, i) => `<button data-up="${k}" data-i="${i}" style="display:flex;width:100%;align-items:center;gap:8px;margin:4px 0;padding:8px 8px;border-radius:8px;border:1px solid #2a3348;background:#121a2e;color:#fff;font:inherit;cursor:pointer;text-align:left">
        <span style="color:${UP[k].color};width:62px">${UP[k].icon} ${UP[k].name}</span><span data-lv style="letter-spacing:2px;width:66px"></span><span data-nx style="flex:1;color:#cfd8e6;font-size:11.5px;line-height:1.25"></span><b data-cost style="color:${GOLD};min-width:64px;text-align:right"></b></button>`).join("")}
      <div data-help style="margin-top:4px;font-size:11px;color:#9aa8bc"></div>`;
    document.body.appendChild(el);
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest("[data-close]")) return this.close();
      const b = e.target.closest("button[data-up]"); if (!b) return;
      this.sel = +b.dataset.i; this._buy();
    });
    // 왼쪽 위 전장 포인트 판 위에 겹치는 투명 누름 자리 (HUD 는 캔버스라 클릭을 받지 못한다)
    const hit = (this.hit = document.createElement("div"));
    hit.className = "aos-shop-hit";
    hit.setAttribute("role", "button"); hit.setAttribute("aria-label", "업그레이드 창 열기");
    hit.style.cssText = "position:fixed;z-index:30;display:none;cursor:pointer;pointer-events:auto;touch-action:manipulation;border-radius:10px";
    document.body.appendChild(hit);
    hit.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); if (this.avail) this.toggle(); });
  }
  get canOpen() { const m = this.m, me = m.me; return me.alive && m.inBase(me) && m.state === "run" && !m.cut && m.s.game.state === "play"; }
  toggle() { if (this.open) this.close(); else this.show(); }
  show() {
    if (!this.canOpen || this.open) return;
    this.open = true; this.el.style.display = "block"; this._draw(true);
    this.m.s.game.sound.play("click");
    if (this.m.s.game.input.device === "gamepad") this._padFocus();
  }
  close() { if (!this.open) return; this.open = false; this.el.style.display = "none"; this._unfocus(); }
  _buy() { if (!this.m.wantBuy(UP_KEYS[this.sel])) this.m.s.game.sound.play("click"); this._draw(true); }
  _btn(i) { return this.el.querySelector(`button[data-i="${i}"]`); }
  _padFocus() { const pu = this.m.s.game.padui; if (pu) pu._focus(this._btn(this.sel)); }
  _unfocus() { const pu = this.m.s.game.padui; if (pu && pu.cur && this.el.contains(pu.cur)) pu._clear(); }
  update() {
    const m = this.m, inp = m.s.game.input, pad = inp.device === "gamepad";
    this.avail = this.canOpen;
    if (!this.avail) { this.close(); if (inp.take("shop")) m.s.hud.toast("업그레이드는 기지 안에서만 — 기지로 돌아가세요", "#ffb02e", 1.4, 18); }
    // 누름 자리: HUD 가 이번에 그린 판 위치를 따른다
    const r = m.panelRect, show = !!r && r.f >= m.hudN - 1 && this.avail;
    if (show) Object.assign(this.hit.style, { display: "block", left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" });
    else if (this.hit.style.display !== "none") this.hit.style.display = "none";
    if (r && this.open) this.el.style.top = Math.round(r.y + r.h + 8) + "px";   // 판 바로 아래에 연다
    if (!this.avail) return;
    if (!this.open) {
      // 기지 안에서는 아이템 키가 창 열기 (전투 시스템보다 먼저 가져간다)
      if (inp.take("item") || inp.take("shop")) this.show();
      return;
    }
    // 게임패드: 십자키 위아래 · 확인 · 뒤로 (메뉴 입력을 창이 가져간다 — padui 강조를 그대로 쓴다)
    if (pad) {
      const rest = [];
      let n;
      while ((n = inp.takeNav())) {
        if (n === "up" || n === "down") { this.sel = (this.sel + (n === "up" ? UP_KEYS.length - 1 : 1)) % UP_KEYS.length; this._padFocus(); }
        else if (n === "ok") this._buy();
        else if (n === "back") { this.close(); return; }
        else rest.push(n);
      }
      inp.nav.push(...rest.filter((x) => x !== "any"));
      inp.take("item");   // 확인 버튼과 아이템 버튼이 같은 패드가 많다 (두 번 사지 않게)
    } else if (inp.take("item")) this._buy();
    if (inp.take("itemNext")) { this.sel = (this.sel + 1) % UP_KEYS.length; m.s.game.sound.play("click"); if (pad) this._padFocus(); }
    if (inp.take("shop")) { this.close(); return; }
    this._draw();
  }
  _draw(force) {
    const me = this.m.me, D = me.aos, inp = this.m.s.game.input, key = `${Math.floor(D.pts)}|${UP_KEYS.map((k) => D.up[k]).join("")}|${this.sel}|${inp.device}`;
    if (!force && key === this._key) return;
    this._key = key;
    this.el.querySelector("[data-pts]").textContent = `${Math.floor(D.pts)}ⓟ`;
    for (const b of this.el.querySelectorAll("button[data-up]")) {
      const k = b.dataset.up, U = UP[k], lv = D.up[k], c = this.m.cost(me, k), can = D.pts >= c;
      b.querySelector("[data-lv]").textContent = "■".repeat(lv) + "□".repeat(UP_MAX - lv);
      b.querySelector("[data-nx]").textContent = lv >= UP_MAX ? `최대 +${U.per * lv}${U.unit}` : `+${U.per * lv}% → +${U.per * (lv + 1)}${U.unit}`;
      b.querySelector("[data-cost]").textContent = lv >= UP_MAX ? "MAX" : `강화 ${c}ⓟ`;
      b.style.opacity = lv >= UP_MAX || can ? "1" : "0.55";
      b.style.borderColor = +b.dataset.i === this.sel ? "#8cff4a" : "#2a3348";
    }
    const touch = this.m.combat.touchUI(), g = (a) => (inp.glyph ? inp.glyph(a) : "");
    this.el.querySelector("[data-help]").textContent = touch ? "칸을 눌러 강화 · ✕ 닫기 · 정비 패드 위에서는 체력이 빠르게 찹니다"
      : inp.device === "gamepad" ? `십자키 ▲▼ 고르기 · [${g("ok")}] 강화 · [${g("back")}] 닫기`
      : `클릭하거나 [${g("itemNext") || "Q"}] 고르기 · [${g("item") || "E"}] 강화 · [B] 닫기`;
  }
  dispose() { this._unfocus(); this.el.remove(); this.hit.remove(); }
}
