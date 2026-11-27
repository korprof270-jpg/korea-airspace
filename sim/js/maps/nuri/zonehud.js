// 대형 지역 맵 비행 중: 지금 있는 구역 표시 + 구역에 들어서면 관제 무전 + (정밀 맵이 있는 구역) 정밀 비행 버튼
import { zoneAt, THEME } from "./zones.js";
import { REGIONS } from "./geo.js";
import { MAPS } from "../index.js";

export class ZoneWatch {
  constructor(s) {
    this.s = s; this.info = s.map.nuri; this.region = REGIONS[this.info.region];
    this.zone = undefined; this.t = 0; this.btn = null; this.label = this.region.name;
    // 정밀 비행은 혼자 하는 자유비행에서만 (경기·임무 중에는 다른 맵으로 넘어가지 않는다)
    this.canJump = !s.cfg.net && s.cfg.mode === "freestyle";
    this._key = (e) => { if (e.code === "KeyO" && this.btn) { e.preventDefault(); this._jump(); } };
    addEventListener("keydown", this._key);
  }
  update(dt) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.3;
    const p = this.s.player.body.pos, [cx, cz] = this.info.center, z = zoneAt(p.x + cx, p.z + cz);
    if (z === this.zone) return;
    const first = this.zone === undefined;
    this.zone = z;
    this.label = z ? `${REGIONS[z.region].name} · ${z.name}` : this.region.name;
    if (this.s.cfg.mode !== "freestyle") { this._button(null); return; }   // 임무 중에는 표시만 (무전은 임무가 쓴다)
    if (z && !first) this._say(`구역 진입 · ${z.name}. ${z.use}.${z.look ? ` ${z.look}.` : ""}`);
    else if (!z && !first) this._say(`${this.region.name} 상공. 구역 밖 비행 중.`);
    this._button(z && z.map && MAPS[z.map] && this.canJump ? z : null);
  }
  // 홀로그램 무전 패널에 한 줄 (지금 나오는 줄 뒤에)
  _say(line) {
    const cfg = this.s.cfg, m = this.s.mode, now = m.time || 0;
    const R = (cfg.radio = (cfg.radio || []).filter(([at]) => at + 4.6 > now));
    const last = R.length ? R[R.length - 1][0] + 4.6 : 0;
    R.push([Math.max(now + 0.2, last), "관제", line]);
  }
  _button(z) {
    if (this.btn && (!z || this.btn.dataset.z !== z.id)) { this.btn.remove(); this.btn = null; }
    if (!z || this.btn) return;
    const b = (this.btn = document.createElement("button"));
    b.className = "holo"; b.dataset.z = z.id;
    b.style.cssText = "--hc:#ffd24a;--ht:none;right:16px;bottom:24%;z-index:32;padding:10px 14px;font:700 13px/1.4 'Noto Sans KR',sans-serif;cursor:pointer;pointer-events:auto;text-align:left";
    b.innerHTML = `<div class="holo-h">◢ 정밀 비행 가능</div>${MAPS[z.map].name} 상세 맵으로 <span style="opacity:.7">[O]</span>`;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); this._jump(); });
    document.body.appendChild(b);
  }
  _jump() {
    const z = this.zone; if (!z || !z.map) return;
    const g = this.s.game, back = { ...this.s.cfg };
    g.startSession({ mode: "freestyle", map: z.map, difficulty: back.difficulty, session: back.session, from: { map: back.map, zone: z.id } });
  }
  hud(h) {
    const m = this.s.mode; if (m.cut || h.lvl === "off") return;
    const u = h.u, z = this.zone, th = z ? THEME[z.theme] : null, txt = this.label + (th ? `  ·  ${th.name}` : "");
    h.holoText(`◢ ${txt}`, h.L.l + 4 * u, h.L.t + 84 * u, { size: 12, align: "left", base: "middle", color: "#bff6ff", glow: "#5ff0ff", blur: 6 });
  }
  dispose() { removeEventListener("keydown", this._key); if (this.btn) { this.btn.remove(); this.btn = null; } }
}
