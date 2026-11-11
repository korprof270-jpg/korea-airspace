// 전투 HUD: 조준선·락온·적/아군 표시·체력/무장·레이더·점수판 (전투 상태는 combat.js 가 관리)
import * as THREE from "../vendor/three.module.min.js";
import { ITEMS, TEAM_CSS } from "./combat.js";
import { settings } from "./config.js";

const _a = new THREE.Vector3();
const _s = {};

export function drawCombatHud(c, h, o = {}) {
  const g = h.g, u = h.u, W = h.W, H = h.H, s = c.s, cam = s.camera, pl = s.player, p = c.player;
  // 피격 붉은 테두리
  if (c.hurtT > 0) {
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    gr.addColorStop(0, "rgba(255,0,0,0)"); gr.addColorStop(1, `rgba(255,30,30,${0.5 * c.hurtT / 0.5})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    h.project(c.hurtDir, cam, _s);
    let dx = _s.x - W / 2, dy = _s.y - H / 2; if (!_s.front) { dx = -dx; dy = -dy; }
    const ang = Math.atan2(dy, dx);
    g.strokeStyle = `rgba(255,70,70,${c.hurtT * 2})`; g.lineWidth = 6 * u;
    g.beginPath(); g.arc(W / 2, H / 2, 110 * u, ang - 0.3, ang + 0.3); g.stroke();
  }
  if (p.shield > 0) { g.strokeStyle = "rgba(33,212,253,0.35)"; g.lineWidth = 10 * u; g.strokeRect(0, 0, W, H); }
  if (p.stunT > 0) h.text("EMP — 조종 불능", W / 2, H * 0.45, { size: 26, align: "center", color: "#b8c8ff" });

  // 적·아군 표시
  for (const a of c.actors) {
    if (!a.alive || a === p || !a.targetable) continue;
    const d = a.pos.distanceTo(cam.position);
    const enemy = c.hostile(p, a) || !p.alive && (c.ffa || a.team !== p.team);
    if (d > (enemy ? 320 : 160)) continue;
    const big = a.kind === "core" || a.kind === "turret" || a.botKind === "boss" || a.botKind === "gunship" || a.kind === "prop";
    const col = enemy ? (a === c.lock && c.lockT >= 0.7 ? "#ff3030" : "rgba(255,90,90,0.9)") : "rgba(90,170,255,0.8)";
    const b = h.bracket(a.pos, cam, a.radius * 1.15, col, d < 150 || big ? a.name : null);
    if (b && (enemy || big)) h.bar(b.x - b.px, b.y + b.px + 4 * u, b.px * 2, 3 * u, a.hp / a.maxHp, enemy ? "#ff5a5a" : "#5aa9ff");
    if (b && a === c.lock) {
      const k = Math.min(1, c.lockT / 0.7);
      g.strokeStyle = k >= 1 ? "#ff3030" : "#ffd24a"; g.lineWidth = 2 * u;
      g.beginPath(); g.arc(b.x, b.y, b.px * (1.9 - k * 0.6), -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
      if (k >= 1) h.text("LOCK", b.x, b.y + b.px + 22 * u, { size: 12, align: "center", color: "#ff3030" });
    }
  }

  // 조준선
  _a.copy(pl.aimPos).addScaledVector(pl.aimDir, 80);
  h.project(_a, cam, _s);
  if (_s.front && p.alive) {
    const x = _s.x, y = _s.y, cc = c.hitMark > 0 ? "#ff5050" : c.aim ? "#ffd24a" : p.overheated ? "#ff9a3a" : "#ffffff";
    g.strokeStyle = cc; g.lineWidth = 2 * u;
    g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.moveTo(x + dx * 6 * u, y + dy * 6 * u); g.lineTo(x + dx * 16 * u, y + dy * 16 * u); }
    g.stroke();
    g.fillStyle = cc; g.fillRect(x - 1.2 * u, y - 1.2 * u, 2.4 * u, 2.4 * u);
    h.bar(x - 26 * u, y + 26 * u, 52 * u, 4 * u, p.heat, p.overheated ? "#ff5a3a" : p.overT > 0 ? "#ff4ad6" : "#ffb347");
  }

  // 체력·무장
  const touch = s.game.input.device === "touch";
  const bx = (settings.hud.sticks && !touch ? 170 : 18) * u, by = H - (touch ? 150 : 34) * u;
  h.text("HP", bx, by - 22 * u, { size: 12, color: "#b8c7d6" });
  h.bar(bx + 28 * u, by - 32 * u, 150 * u, 11 * u, p.hp / p.maxHp, p.hp > 50 ? "#3dd68c" : p.hp > 25 ? "#ffd24a" : "#ff5a5a");
  if (p.shield > 0) h.bar(bx + 28 * u, by - 38 * u, 150 * u, 4 * u, p.shield / 80, "#21d4fd", "rgba(0,0,0,0)");
  h.text(`${Math.ceil(p.hp)}`, bx + 186 * u, by - 22 * u, { size: 14, mono: true });
  h.text(`미사일 ${"▮".repeat(p.missiles)}${"▯".repeat(Math.max(0, 4 - p.missiles))}`, bx, by, { size: 14, color: "#ffb86b" });
  if (p.item) h.text(`[E] ${ITEMS[p.item].name}`, bx + 150 * u, by, { size: 14, color: "#" + ITEMS[p.item].color.toString(16).padStart(6, "0") });
  const buffs = [];
  if (p.boostT > 0) buffs.push(`부스터 ${p.boostT.toFixed(0)}s`);
  if (p.overT > 0) buffs.push(`과충전 ${p.overT.toFixed(0)}s`);
  if (p.shieldT > 0 && p.shield > 0) buffs.push(`실드 ${p.shieldT.toFixed(0)}s`);
  if (buffs.length) h.text(buffs.join("  ·  "), bx, by - 46 * u, { size: 13, color: "#ffe14a" });

  if (c.warn > 0 && Math.floor(s.time * 8) % 2) h.text("⚠ 미사일 접근", W / 2, H * 0.72, { size: 22, align: "center", color: "#ff3030" });
  if (!p.alive) h.text(`격추됨 — ${Math.max(0, p.respawnT).toFixed(1)}초 후 재출격`, W / 2, H * 0.4, { size: 26, align: "center", color: "#ff6b5a" });

  drawRadar(c, h, o.radarRange || 160);
  if (s.game.input.isHeld("score")) drawBoard(c, h);
}

function drawRadar(c, h, range) {
  const g = h.g, u = h.u, R = 62 * u, cx = h.W - R - 16 * u, cy = h.H - R - 16 * u, p = c.player, yaw = c.s.player.body.heading;
  g.fillStyle = "rgba(8,12,20,0.5)"; g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 1;
  g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(cx, cy, R / 2, 0, 7); g.strokeStyle = "rgba(255,255,255,0.12)"; g.stroke();
  const cs = Math.cos(yaw), sn = Math.sin(yaw);
  const dot = (pos, col, size, sq) => {
    const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
    let rx = dx * cs - dz * sn, ry = dx * sn + dz * cs;
    const d = Math.hypot(rx, ry), k = d > range ? range / d : 1;
    rx = rx * k / range * R; ry = ry * k / range * R;
    g.fillStyle = col;
    if (sq) g.fillRect(cx + rx - size, cy + ry - size, size * 2, size * 2);
    else { g.beginPath(); g.arc(cx + rx, cy + ry, size, 0, 7); g.fill(); }
  };
  for (const pk of c.pickups) if (pk.active) dot(pk.pos, "rgba(255,225,74,0.8)", 1.8 * u, true);
  for (const a of c.actors) {
    if (!a.alive || a === p || !a.targetable) continue;
    const enemy = c.ffa || a.team !== p.team;
    dot(a.pos, enemy ? "#ff5a5a" : "#5aa9ff", (a.static ? 3.6 : 2.8) * u, a.static);
  }
  g.fillStyle = "#fff"; g.beginPath(); g.moveTo(cx, cy - 6 * u); g.lineTo(cx + 4 * u, cy + 4 * u); g.lineTo(cx - 4 * u, cy + 4 * u); g.fill();
}

function drawBoard(c, h) {
  const rows = c.board(), u = h.u, w = 380 * u, x = h.W / 2 - w / 2;
  let y = h.H * 0.2;
  h.panel(x, y, w, (rows.length + 1.6) * 24 * u, "rgba(8,12,20,0.82)");
  y += 26 * u;
  h.text("이름", x + 16 * u, y, { size: 13, color: "#9fb4c8" });
  h.text("점수", x + w - 150 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
  h.text("격추", x + w - 84 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
  h.text("피격추", x + w - 16 * u, y, { size: 13, align: "right", color: "#9fb4c8" });
  for (const a of rows) {
    y += 24 * u;
    const col = a.isPlayer ? "#ffd24a" : c.ffa ? "#fff" : TEAM_CSS[a.team];
    h.text(a.name, x + 16 * u, y, { size: 14, color: col });
    h.text(`${Math.round(a.score)}`, x + w - 150 * u, y, { size: 14, align: "right", mono: true, color: col });
    h.text(`${a.kills}`, x + w - 84 * u, y, { size: 14, align: "right", mono: true, color: col });
    h.text(`${a.deaths}`, x + w - 16 * u, y, { size: 14, align: "right", mono: true, color: col });
  }
}
