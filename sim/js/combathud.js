// 전투 HUD: 조준선·락온·명중 표시·피격 방향·적/아군 표시·체력/무장·레이더·점수판 (전투 상태는 combat.js 가 관리)
// 화면 전체 색 효과(피격 번쩍임 등)는 feel.js 담당 — 여기서는 계기 요소만 그린다
import * as THREE from "../vendor/three.module.min.js";
import { ITEMS, ITEM_SLOTS, TEAM_CSS } from "./combat.js";
import { clamp } from "./config.js";
import { HC, INK } from "./hud.js";

const _a = new THREE.Vector3();
const _s = {};
const LOCK_T = 0.7;
const PLATE = "rgba(12,18,32,0.7)";

// 보스 등장 컷신: 위아래 검은 띠, 경고 문구, 보스 이름, 차오르는 체력바
export function drawBossCut(h, k) {
  const g = h.g, u = h.u, W = h.W, H = h.H, e = Math.min(1, k.t / 0.35), bar = H * 0.13 * e, a = k.a;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
  const col = k.mid ? "#ffb02e" : "#ff3d4d";
  if (Math.floor(k.t * 4) % 2 === 0) h.text("⚠ WARNING ⚠", W / 2, bar + 34 * u, { size: 22, align: "center", color: col });
  const s = Math.min(1, Math.max(0, (k.t - 0.4) / 0.4));
  h.fade(s);
  h.text(k.sub, W / 2, H * 0.62, { size: 15, align: "center", color: col });
  h.text(k.name, W / 2, H * 0.62 + 44 * u, { size: 40, align: "center", color: "#fff" });
  const bw = Math.min(520 * u, W * 0.6), fill = Math.min(1, Math.max(0, (k.t - 0.9) / 1.2));
  h.bar(W / 2 - bw / 2, H * 0.62 + 64 * u, bw, 12 * u, (a.hp / a.maxHp) * fill, col);
  h.fade(1);
  if (k.t > 0.6) h.text("레이저 버튼 · 건너뛰기", W - 18 * u, H - bar + 22 * u > H - 8 ? H - 12 * u : H - bar - 10 * u, { size: 12, align: "right", color: "#9aa8bc" });
}

// 보스 체력바: 위 가운데 넓게 (살아 있는 보스 모두, 위에서 아래로 쌓는다)
function bossBars(c, h) {
  const u = h.u, L = h.L, W = h.W;
  let y = L.subY + 30 * u;
  for (const a of c.actors) {
    if (!a.alive || !a.bossBar || !a.targetable) continue;
    const bw = Math.min(460 * u, W * 0.5), x = W / 2 - bw / 2, col = a.bossBar.mid ? "#ffb02e" : "#ff3d4d", k = a.hp / a.maxHp;
    h.text(`${a.bossBar.mid ? "중간 보스" : "BOSS"} · ${a.name}`, W / 2, y, { size: 14, align: "center", color: col });
    h.plate(x - 6 * u, y + 6 * u, bw + 12 * u, 20 * u, { fill: "rgba(10,14,28,0.92)", accent: col, skew: 0.12 });
    h.segbar(x + 8 * u, y + 10 * u, bw - 14 * u, 12 * u, k, 20, col);
    h.text(`${Math.ceil(k * 100)}%`, x + bw + 14 * u, y + 17 * u, { size: 12, base: "middle", mono: true, color: "#fff" });
    y += 44 * u;
  }
}

export function drawCombatHud(c, h, o = {}) {
  if (c.s.mode.cut) return drawBossCut(h, c.s.mode.cut);
  if (h.lvl === "off") return;
  const g = h.g, u = h.u, H = h.H, s = c.s, cam = s.camera, p = c.player;
  const full = h.lvl === "full";
  h.fade(1);

  if (c.hurtT > 0) hurtArc(c, h);
  if (p.stunT > 0) h.banner("EMP — 조종 불능", H * 0.45, "#b8c8ff", 22);

  // 적·아군 표시
  const locked = c.lockT >= LOCK_T;
  for (const a of c.actors) {
    if (!a.alive || a === p || !a.targetable) continue;
    const d = a.pos.distanceTo(cam.position);
    const enemy = c.hostile(p, a) || !p.alive && (c.ffa || a.team !== p.team);
    if (d > (enemy ? 320 : 160)) continue;
    if (!enemy && !full) continue;
    const big = a.kind === "core" || a.kind === "turret" || a.botKind === "boss" || a.botKind === "gunship" || a.kind === "prop";
    const isLock = a === c.lock, isAim = a === c.aim;
    const col = enemy ? (isLock && locked ? "#ff3030" : isAim ? "#ffd24a" : "rgba(255,96,96,0.95)") : "rgba(96,174,255,0.9)";
    const b = h.bracket(a.pos, cam, a.radius * 1.15, col, d < 90 || big || isAim || isLock ? a.name : null);
    if (!b) continue;
    if (enemy || big) h.bar(b.x - b.px, b.y + b.px + 5 * u, b.px * 2, 4 * u, a.hp / a.maxHp, enemy ? "#ff5a5a" : "#5aa9ff");
    if (isLock && enemy) lockRing(h, b, clamp(c.lockT / LOCK_T, 0, 1), s.time);
  }

  // 아이템 표지: 가까운 아이템에 아이콘·이름·거리 (칸이 가득 차 못 집는 것은 흐리게)
  if (p.alive) for (const pk of c.pickups) {
    if (!pk.active) continue;
    const d = pk.pos.distanceTo(cam.position);
    if (d > 110 || d < 4) continue;
    const sp = h.project(pk.pos, cam, h._s);
    if (!sp.on) continue;
    const it = ITEMS[pk.type], col = "#" + it.color.toString(16).padStart(6, "0"), can = c.canTake(p, pk.type);
    const r = clamp(520 / d, 9, 20) * u, x = sp.x, y = sp.y - clamp(900 / d, 14, 46) * u;
    h.fade(can ? (d > 80 ? (110 - d) / 30 : 1) : 0.35);
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = "rgba(10,16,30,0.82)"; g.fill();
    g.lineWidth = 2.5 * u; g.strokeStyle = col; g.stroke();
    h.text(it.icon, x, y + 1 * u, { size: r / u * 1.05, align: "center", base: "middle", color: col, shadow: false });
    if (d < 60 && full) h.text(can ? `${it.name} ${d.toFixed(0)}m` : "칸 가득", x, y - r - 5 * u, { size: 11, align: "center", color: col });
    h.fade(1);
  }

  // 미사일 표지: 나를 노리는 것은 빨간 경고, 내가 쏜 것은 작은 주황 표시
  for (const m of c.missiles) {
    const mine = m.owner === p, atMe = m.target === p;
    if (!mine && !atMe) continue;
    const d = m.pos.distanceTo(cam.position);
    if (atMe) { if (Math.floor(s.time * 10) % 2 || d > 60) h.marker(m.pos, cam, "#ff3030", "미사일", d); }
    else {
      const sp = h.project(m.pos, cam, h._s);
      if (!sp.on || d < 6) continue;
      const r = clamp(260 / d, 4, 10) * u;
      g.beginPath(); g.moveTo(sp.x, sp.y - r); g.lineTo(sp.x + r, sp.y); g.lineTo(sp.x, sp.y + r); g.lineTo(sp.x - r, sp.y); g.closePath();
      h.stroke2("#ffa030", 2 * u);
    }
  }

  if (p.alive) reticle(c, h);
  status(c, h);
  bossBars(c, h);

  if (c.warn > 0 && Math.floor(s.time * 8) % 2) h.banner("⚠ 미사일 접근", H * 0.72, HC.warn, 20);
  if (!p.alive) h.banner(`격추됨 — ${Math.max(0, p.respawnT || 0).toFixed(1)}초 후 재출격`, H * 0.4, HC.warn, 24);

  if (h.vis("radar")) drawRadar(c, h, o.radarRange || 160);
  if (s.game.input.isHeld("score")) drawBoard(c, h);
  g.globalAlpha = h.opacity;
}

// 피격 방향: 화면 중심 둘레의 붉은 호
function hurtArc(c, h) {
  const g = h.g, u = h.u, L = h.L, k = clamp(c.hurtT / 0.5, 0, 1);
  h.project(c.hurtDir, c.s.camera, _s);
  const ang = h._dirAngle(_s), R = Math.min(h.H * 0.3, 128 * u) + (1 - k) * 10 * u;
  h.fade(Math.min(1, k * 1.6));
  g.beginPath(); g.arc(L.cx, L.cy, R, ang - 0.34, ang + 0.34);
  g.lineCap = "round"; g.lineWidth = 12 * u; g.strokeStyle = INK; g.stroke();
  g.lineWidth = 7 * u; g.strokeStyle = "#ff4646"; g.stroke();
  // 안쪽을 향한 쐐기
  const ca = Math.cos(ang), sa = Math.sin(ang), r2 = R - 13 * u, w = 9 * u;
  g.beginPath();
  g.moveTo(L.cx + ca * (r2 - 9 * u), L.cy + sa * (r2 - 9 * u));
  g.lineTo(L.cx + ca * r2 - sa * w, L.cy + sa * r2 + ca * w);
  g.lineTo(L.cx + ca * r2 + sa * w, L.cy + sa * r2 - ca * w);
  g.closePath();
  h.fill2("#ff4646", 2.5);
  h.fade(1);
}

// 락온 진행: 네 쐐기가 표적으로 조여 들고, 완료되면 붉게 고정
function lockRing(h, b, k, time) {
  const g = h.g, u = h.u, done = k >= 1;
  const r = b.px * (2.3 - 1.1 * k) + 6 * u, rot = (1 - k) * 1.4 + Math.PI / 4, col = done ? "#ff3030" : HC.gold, w = 7 * u;
  if (done && Math.floor(time * 10) % 2) h.fade(0.55);
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    g.beginPath();
    g.moveTo(b.x + ca * r, b.y + sa * r);
    g.lineTo(b.x + ca * (r + 11 * u) - sa * w, b.y + sa * (r + 11 * u) + ca * w);
    g.lineTo(b.x + ca * (r + 11 * u) + sa * w, b.y + sa * (r + 11 * u) - ca * w);
    g.closePath();
    h.fill2(col, 2);
  }
  h.fade(1);
  g.beginPath(); g.arc(b.x, b.y, r - 3 * u, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
  h.stroke2(col, 2 * u);
  if (done) h.text("LOCK", b.x, b.y + r + 26 * u, { size: 13, align: "center", color: "#ff5050" });
}

// 조준선: 조준(적이 걸림)·락온·명중·과열 상태에 반응
function reticle(c, h) {
  const g = h.g, u = h.u, s = c.s, pl = s.player, p = c.player;
  _a.copy(pl.aimPos).addScaledVector(pl.aimDir, 80);
  h.project(_a, s.camera, _s);
  if (!_s.front) return;
  const x = _s.x, y = _s.y, t = s.time;
  const aim = !!c.aim, hot = !!p.overheated, lockK = c.lock ? clamp(c.lockT / LOCK_T, 0, 1) : 0, hit = clamp((c.hitMark || 0) / 0.18, 0, 1);
  const col = hot ? (Math.floor(t * 8) % 2 ? "#ff5a3a" : "#ffb347") : aim ? "#ff6a3a" : "#ffffff";
  const gap = (aim ? 4.5 : 8) * u + hit * 3 * u, len = (aim ? 11 : 9) * u;

  g.save(); g.translate(x, y);
  if (hot) g.rotate(Math.PI / 4);
  g.beginPath();
  g.moveTo(gap, 0); g.lineTo(gap + len, 0); g.moveTo(-gap, 0); g.lineTo(-gap - len, 0);
  g.moveTo(0, gap); g.lineTo(0, gap + len); g.moveTo(0, -gap); g.lineTo(0, -gap - len);
  h.stroke2(col, 2.6 * u);
  g.restore();
  g.beginPath(); g.arc(x, y, 2.2 * u, 0, 7);
  h.fill2(col, 2);

  // 조준 중: 표적을 감싸는 회전 꺾쇠
  if (aim && !hot) {
    const r = 21 * u, rot = t * 2.4;
    g.beginPath();
    for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; g.moveTo(x + Math.cos(a - 0.3) * r, y + Math.sin(a - 0.3) * r); g.arc(x, y, r, a - 0.3, a + 0.3); }
    h.stroke2("#ff6a3a", 2.4 * u);
  }
  // 락온 진행 호
  if (lockK > 0 && p.missiles > 0) {
    const done = lockK >= 1;
    g.beginPath(); g.arc(x, y, 29 * u, -Math.PI / 2, -Math.PI / 2 + lockK * Math.PI * 2);
    h.stroke2(done ? "#ff3030" : HC.gold, 2.4 * u);
    if (done && Math.floor(t * 6) % 2) h.text("미사일 준비", x, y - 38 * u, { size: 11, align: "center", color: "#ff5050" });
  }
  // 명중 표시(×)
  if (hit > 0) {
    const r0 = (8 + (1 - hit) * 5) * u, r1 = r0 + 9 * u;
    g.beginPath();
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); g.moveTo(x + ca * r0, y + sa * r0); g.lineTo(x + ca * r1, y + sa * r1); }
    h.fade(Math.min(1, hit * 2));
    h.stroke2("#ffffff", 3 * u);
    h.fade(1);
  }
  // 발열 게이지(조준선 아래 호)
  const heat = clamp(p.heat || 0, 0, 1), over = p.overT > 0;
  if (heat > 0.02 || hot || over) {
    const r = 36 * u, a0 = Math.PI * 0.78, a1 = Math.PI * 0.22;      // 왼아래 → 오른아래
    g.lineCap = "round";
    g.beginPath(); g.arc(x, y, r, a0, a1, true);
    g.lineWidth = 8 * u; g.strokeStyle = INK; g.stroke();
    g.lineWidth = 4.5 * u; g.strokeStyle = "rgba(255,255,255,0.2)"; g.stroke();
    const f = over ? 1 : heat;
    g.beginPath(); g.arc(x, y, r, a0, a0 - (a0 - a1) * f, true);
    g.lineWidth = 4.5 * u; g.strokeStyle = hot ? "#ff4a3a" : over ? HC.pink : heat > 0.7 ? HC.orange : HC.gold; g.stroke();
    if (hot) h.text("과열", x, y + r + 16 * u, { size: 12, align: "center", color: "#ff6b5a" });
    else if (over) h.text("과충전", x, y + r + 16 * u, { size: 11, align: "center", color: HC.pink });
  }
}

// 체력·실드·미사일·아이템 상태판
function status(c, h) {
  const g = h.g, u = h.u, L = h.L, p = c.player, t = c.s.time;
  const w = L.statusW, x = L.statusRight ? L.statusX - w : L.statusX, yb = L.b, hh = 30 * u, y = yb - hh;
  h.plate(x, y, w, hh, { skew: 0.08, accent: "#ff9a3a", fill: PLATE });
  // 미사일 (체력은 아래 가운데 체력바로 옮겼다)
  const my = y + 8 * u, n = Math.max(4, p.missiles || 0);
  h.text("미사일", x + 11 * u, my + 7 * u, { size: 10, base: "middle", color: HC.dim, shadow: false });
  for (let i = 0; i < n; i++) {
    const mx = x + 48 * u + i * 13 * u, on = i < p.missiles;
    g.beginPath();
    g.moveTo(mx + 3 * u, my); g.lineTo(mx + 10 * u, my); g.lineTo(mx + 7 * u, my + 13 * u); g.lineTo(mx, my + 13 * u); g.closePath();
    g.fillStyle = on ? "#ff9a3a" : "rgba(255,255,255,0.14)"; g.fill();
    g.lineJoin = "round"; g.lineWidth = 2 * u; g.strokeStyle = INK; g.stroke();
  }
  // 지속 효과
  // 아이템 칸 2개: 지금 쓸 것은 크게·밝게, 다른 하나는 흐리게
  const sh = 40 * u, sy = y - sh - 7 * u, gap = 6 * u, sw = (w - gap) / 2, pop = Math.max(0, p.swapT || 0) / 0.35;
  for (let i = 0; i < ITEM_SLOTS; i++) {
    const type = p.items[i], it = type && ITEMS[type], on = !!it && i === p.sel, sx = x + i * (sw + gap), lift = on ? (3 + pop * 5) * u : 0;
    const col = it ? "#" + it.color.toString(16).padStart(6, "0") : "#5b6880";
    if (it && !on) h.fade(0.6);
    h.plate(sx, sy - lift, sw, sh, { skew: 0.1, fill: on ? "rgba(12,18,34,0.94)" : PLATE, accent: it ? col : null, stroke: on ? col : INK, lw: on ? 3 : 2.5 });
    if (it) {
      h.text(it.icon, sx + 20 * u, sy - lift + sh / 2 + 1 * u, { size: on ? 21 : 17, align: "center", base: "middle", color: col, shadow: false });
      h.text(it.name, sx + 36 * u, sy - lift + (L.touch ? sh / 2 + 1 * u : 14 * u), { size: on ? 14 : 12, base: "middle", color: on ? "#fff" : col, shadow: false });
      if (!L.touch) h.text(on ? "E 사용" : "Q 교체", sx + 36 * u, sy - lift + 29 * u, { size: 10, base: "middle", color: on ? HC.gold : HC.dim, shadow: false });
    } else h.text("빈 칸", sx + sw / 2, sy + sh / 2 + 1 * u, { size: 11, align: "center", base: "middle", color: "#5b6880", shadow: false });
    h.fade(1);
  }
  let bxp = x + 8 * u;
  const buff = (txt, col) => { h.text(txt, bxp, sy - 10 * u, { size: 12, color: col }); bxp += (txt.length * 11 + 10) * u; };
  if (p.shield > 0 && p.shieldT > 0) buff(`실드 ${p.shieldT.toFixed(0)}s`, HC.cyan);
  if (p.boostT > 0) buff(`부스터 ${p.boostT.toFixed(0)}s`, "#ffe14a");
  if (p.overT > 0) buff(`과충전 ${p.overT.toFixed(0)}s`, HC.pink);
}

function drawRadar(c, h, range) {
  const g = h.g, u = h.u, L = h.L, R = L.radarR, cx = L.radarX, cy = L.radarY, p = c.player, yaw = c.s.player.body.heading;
  g.beginPath(); g.arc(cx, cy, R, 0, 7);
  g.fillStyle = "rgba(10,16,30,0.62)"; g.fill();
  g.lineWidth = 3 * u; g.strokeStyle = INK; g.stroke();
  g.lineWidth = 1.5 * u; g.strokeStyle = "rgba(120,220,255,0.28)";
  g.beginPath(); g.arc(cx, cy, R * 0.5, 0, 7); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
  // 전방 시야 부채꼴 + 회전 스윕
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); g.closePath();
  g.fillStyle = "rgba(120,220,255,0.1)"; g.fill();
  const sw = (h.t * 1.8) % (Math.PI * 2);
  g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 1.5 * u, sw - 0.5, sw); g.closePath();
  g.fillStyle = "rgba(120,255,190,0.12)"; g.fill();
  g.beginPath(); g.arc(cx, cy, R - 1.5 * u, 0, 7); g.lineWidth = 1.5 * u; g.strokeStyle = "rgba(120,220,255,0.55)"; g.stroke();

  const cs = Math.cos(yaw), sn = Math.sin(yaw), lim = R - 5 * u;
  const dot = (pos, col, size, shape) => {
    const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
    let rx = dx * cs - dz * sn, ry = dx * sn + dz * cs;
    const d = Math.hypot(rx, ry), far = d > range, k = far ? range / d : 1;
    rx = rx * k / range * lim; ry = ry * k / range * lim;
    if (far) size *= 0.7;
    g.beginPath();
    if (shape === 1) g.rect(cx + rx - size, cy + ry - size, size * 2, size * 2);
    else if (shape === 2) { g.moveTo(cx + rx, cy + ry - size * 1.3); g.lineTo(cx + rx + size * 1.2, cy + ry); g.lineTo(cx + rx, cy + ry + size * 1.3); g.lineTo(cx + rx - size * 1.2, cy + ry); g.closePath(); }
    else g.arc(cx + rx, cy + ry, size, 0, 7);
    g.fillStyle = col; g.fill();
    g.lineWidth = 1.5 * u; g.strokeStyle = INK; g.stroke();
  };
  for (const pk of c.pickups) if (pk.active) dot(pk.pos, "rgba(255,225,74,0.9)", 2 * u, 1);
  for (const a of c.actors) {
    if (!a.alive || a === p || !a.targetable) continue;
    const enemy = c.ffa || a.team !== p.team;
    dot(a.pos, enemy ? (a === c.lock && c.lockT >= LOCK_T ? "#ffffff" : "#ff5a5a") : "#5aa9ff", (a.static ? 3.8 : 3) * u, a.static ? 1 : 0);
  }
  if (h.obj && h.obj.pos) dot(h.obj.pos, h.obj.color || HC.ok, 3.2 * u, 2);
  // 북쪽 표시 + 내 기체
  h.text("북", cx + sn * (R + 1 * u), cy - cs * (R + 1 * u), { size: 10, align: "center", base: "middle", color: "#ff8a7a" });
  g.beginPath(); g.moveTo(cx, cy - 7 * u); g.lineTo(cx + 5 * u, cy + 5 * u); g.lineTo(cx, cy + 2 * u); g.lineTo(cx - 5 * u, cy + 5 * u); g.closePath();
  h.fill2("#ffffff", 2);
  if (h.lvl === "full") h.text(`${range}m`, cx + R * 0.72, cy + R * 0.98, { size: 9, align: "center", color: HC.dim });
}

function drawBoard(c, h) {
  const rows = c.board(), u = h.u, w = 400 * u, x = h.W / 2 - w / 2, rh = 24 * u;
  let y = h.H * 0.2;
  h.panel(x, y, w, (rows.length + 1.7) * rh, "rgba(10,15,28,0.88)", 12);
  y += 27 * u;
  h.text("이름", x + 18 * u, y, { size: 13, color: HC.dim, shadow: false });
  h.text("점수", x + w - 152 * u, y, { size: 13, align: "right", color: HC.dim, shadow: false });
  h.text("격추", x + w - 86 * u, y, { size: 13, align: "right", color: HC.dim, shadow: false });
  h.text("피격추", x + w - 18 * u, y, { size: 13, align: "right", color: HC.dim, shadow: false });
  for (const a of rows) {
    y += rh;
    const col = a.isPlayer ? HC.gold : c.ffa ? "#fff" : TEAM_CSS[a.team];
    if (a.isPlayer) { h.g.fillStyle = "rgba(255,210,74,0.14)"; h.g.fillRect(x + 6 * u, y - 17 * u, w - 12 * u, rh - 2 * u); }
    h.text(a.name, x + 18 * u, y, { size: 14, color: col, shadow: false });
    h.text(`${Math.round(a.score)}`, x + w - 152 * u, y, { size: 14, align: "right", mono: true, color: col, shadow: false });
    h.text(`${a.kills}`, x + w - 86 * u, y, { size: 14, align: "right", mono: true, color: col, shadow: false });
    h.text(`${a.deaths}`, x + w - 18 * u, y, { size: 14, align: "right", mono: true, color: col, shadow: false });
  }
}
