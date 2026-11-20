// PvP 메뉴 화면 (UI 에 섞어 넣는 메서드): 허브 · 랜덤 매칭 대기 · 방 목록 · 방 대기실
// 보기(view): hub | queue | browse | room. 방·로비가 바뀌면 [data-live] 영역만 다시 그린다 (입력 칸은 그대로)
import { MAPS, MAP_LIST } from "./maps/index.js";
import { PvpClient, PVP_MODES, BOT_DIFF, TIMES, TEAM_LABEL, MAX_PLAYERS } from "./pvp.js";
import { TEAM_CSS } from "./combat.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const RULE = "파츠 능력치 미적용 · 스킬 피해 60%";

export const PvpUI = {
  pvpClient() {
    if (!this._pvc) {
      this._pvc = new PvpClient(this.game);
      this._pvc.on(() => { if (this.screen === "pvp") this._pvRefresh(); });
      this.root.addEventListener("change", (e) => {
        const el = e.target;
        if (el.dataset.pvsel) this._pvc.setCfg(el.dataset.pvsel, el.value);
        if (el.dataset.pvnick !== undefined) { this._pvc.setName(el.value); el.value = this._pvc.name; }
      });
      this.root.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || this.screen !== "pvp") return;
        if (e.target.dataset.pvcode !== undefined) { e.preventDefault(); this.a_pvjoincode(); }
        if (e.target.dataset.pvnick !== undefined) { e.preventDefault(); e.target.blur(); }
      });
    }
    return this._pvc;
  },
  _pvOpen(view = "hub") {
    this._pv = view;
    this.pvpClient().init();
    this.show("pvp");
  },

  s_pvp() {
    const c = this.pvpClient(), v = this._pv || "hub";
    clearInterval(this._pvTick);
    this._pvTick = setInterval(() => { if (this.screen !== "pvp") clearInterval(this._pvTick); else if (this._pv === "queue") this._pvRefresh(); }, 1000);
    const title = { hub: ["PVP", "대인전"], queue: ["BATTLE.NET", "랜덤 매칭"], browse: ["CUSTOM", "커스텀 방"], room: ["ROOM", "방 대기실"] }[v] || ["PVP", "대인전"];
    let stat = "";
    if (v === "hub") stat = `<div class="pvnick"><label>내 이름</label><input data-pvnick maxlength="16" value="${esc(c.name)}" placeholder="이름을 적어 주세요" aria-label="내 이름"><span class="muted">다른 플레이어에게 보이는 이름</span></div>`;
    if (v === "browse") stat = `<div class="pvforms">
        <div class="pvform"><b>방 만들기</b><div class="row"><input data-pvrname maxlength="16" placeholder="${esc(c.name)}의 방" aria-label="방 이름"><button class="primary sm" data-a="pvcreate">만들기</button></div></div>
        <div class="pvform"><b>코드로 입장</b><div class="row"><input data-pvcode maxlength="6" placeholder="예: K7QX" aria-label="방 코드" autocapitalize="characters"><button class="ghost" data-a="pvjoincode">입장</button></div></div>
      </div>`;
    return `<div class="screen pvp" style="--c:#21d4fd">
      <div class="wrap pvwrap" data-scroll>
        <div class="head"><button class="back" data-a="back">← 뒤로</button><h2><span class="en">${title[0]}</span>${title[1]}</h2><span class="sp"></span><span class="pvrule">${RULE}</span></div>
        ${stat}
        <div data-live>${this._pvLive()}</div>
      </div></div>`;
  },

  // 바뀌는 부분만 다시: 패드로 고른 요소·열린 선택 상자는 지킨다
  _pvRefresh() {
    const box = this.root.querySelector("[data-live]");
    if (!box) return;
    const c = this._pvc;
    if (this._pv === "room" && !c.inRoom()) { this._pv = "browse"; return this.show("pvp"); }
    if ((this._pv === "browse" || this._pv === "hub" || this._pv === "queue") && c.inRoom() && c.cfg) { this._pv = "room"; return this.show("pvp"); }
    if (this._pv === "queue" && !c.queue && !c.inRoom()) { this._pv = "hub"; }
    const act = document.activeElement;
    if (act && box.contains(act) && (act.tagName === "SELECT" || act.tagName === "INPUT")) return;
    const pu = this.game.padui, cur = pu.cur && box.contains(pu.cur) ? { a: pu.cur.dataset.a, v: pu.cur.dataset.v, k: pu.cur.dataset.k } : null;
    box.innerHTML = this._pvLive();
    if (cur) { const el = [...box.querySelectorAll("[data-a]")].find((o) => o.dataset.a === cur.a && o.dataset.v === cur.v && o.dataset.k === cur.k); pu.cur = null; if (el) pu._focus(el); }
  },

  _pvNotice() {
    const c = this._pvc;
    if (c.status === "connecting" || c.status === "off") return `<div class="pvnote">온라인 연결 중… <span class="muted">(최대 10초)</span></div>`;
    if (c.status === "none") return `<div class="pvnote warn">온라인에 연결할 수 없습니다. 컴퓨터와 연습은 할 수 있습니다.</div>`;
    if (c.kind === "local") return `<div class="pvnote warn"><b>로컬 테스트 모드</b> — 같은 브라우저의 다른 탭끼리만 연결됩니다. 실제 온라인 대전은 claude.ai 안에서 열었을 때만 됩니다 (로그인한 조직 구성원과 초대된 게스트. 공개 링크로 들어온 사람은 연결할 수 없습니다).</div>`;
    return `<div class="pvnote ok">● 온라인 · 지금 접속 ${c.online()}명</div>`;
  },

  _pvLive() {
    const c = this._pvc, v = this._pv || "hub";
    const msg = c.msg ? `<div class="pvmsg">${esc(c.msg)}</div>` : "";
    if (v === "hub") {
      const ok = c.status === "ready";
      const modes = Object.entries(PVP_MODES).filter(([, d]) => d.random !== false).map(([id, d]) => `<button class="pvmode" data-a="pvq" data-v="${id}"${ok ? "" : " disabled"}><span class="ic">${d.icon}</span><b>${esc(d.name)}</b><i>${esc(d.desc)}</i></button>`).join("");
      return `${this._pvNotice()}${msg}
        <div class="pvhub">
          <section class="pvcard bnet"><small>BATTLE.NET</small><h3>배틀넷 <span>랜덤 매칭</span></h3><p>지금 접속한 플레이어와 바로 한 판. 모드를 고르면 대기열에 들어갑니다.</p><div class="pvmodes">${modes}</div></section>
          <section class="pvcard cust"><small>CUSTOM</small><h3>커스텀 <span>방 만들기 · 참가</span></h3><p>방을 만들어 코드를 알려 주거나, 열린 방에 들어갑니다. 방장은 맵·모드·시간·팀·컴퓨터를 정합니다.</p>
            <div class="row"><button class="primary" data-a="pvview" data-v="browse"${ok ? "" : " disabled"}>방 목록 · 만들기 →</button><button class="ghost" data-a="pvoffline">컴퓨터와 연습</button></div></section>
        </div>`;
    }
    if (v === "queue") {
      const q = c.queue, n = c.queued().length, sec = q ? Math.floor((performance.now() - q.t0) / 1000) : 0;
      const d = q && PVP_MODES[q.mode];
      return `${this._pvNotice()}${msg}<div class="pvqueue">
          <div class="spin" aria-hidden="true"></div>
          <h3>${d ? esc(d.name) : ""} 상대를 찾는 중…</h3>
          <p>대기 중 <b>${n}</b>명 · ${sec}초</p>
          ${c.aloneLong() ? `<p class="muted">지금 대기 중인 다른 플레이어가 없습니다.</p><button class="primary" data-a="pvsolo">컴퓨터와 대전</button>` : `<p class="muted">2명 이상 모이면 몇 초 안에 시작합니다 (최대 ${MAX_PLAYERS}명)</p>`}
          <button class="ghost" data-a="pvqcancel">취소</button></div>`;
    }
    if (v === "browse") {
      const L = c.listings();
      const rows = L.length ? L.map((l) => `<button class="pvroom" data-a="pvjoin" data-v="${esc(l.c)}"${l.p >= l.x ? " disabled" : ""}>
          <b>${esc(l.n)}</b><span class="code">${esc(l.c)}</span><span>${esc(PVP_MODES[l.o].name)} · ${esc(l.m ? MAPS[l.m].name : "?")}</span><span class="cnt">${l.p}/${l.x}${l.s ? " · 진행 중" : ""}</span></button>`).join("")
        : `<p class="muted pvempty">열린 방이 없습니다. 새로 만들어 보세요.</p>`;
      return `${this._pvNotice()}${msg}<h3 class="pvh">열린 방 ${L.length}</h3><div class="pvrooms">${rows}</div>`;
    }
    return this._pvRoom(msg);
  },

  _pvRoom(msg) {
    const c = this._pvc, cfg = c.cfg;
    if (!cfg) return `${msg}<div class="pvqueue"><div class="spin" aria-hidden="true"></div><h3>방 ${esc(c.code)} 에 들어가는 중…</h3><button class="ghost" data-a="pvleave">취소</button></div>`;
    const def = PVP_MODES[cfg.o], H = c.isHost, slots = c.slots(), teams = def.teams ? cfg.tn : 1;
    const slot = (s) => `<div class="pvslot${s.me ? " me" : ""}${s.bot ? " bot" : ""}">
        <span class="nm">${s.host ? '<i class="crown" title="방장">👑</i>' : ""}${esc(s.name)}${s.me ? " <em>(나)</em>" : ""}</span>
        <span class="st">${s.bot ? "" : s.host ? "방장" : s.ready ? '<b class="rdy">준비</b>' : "대기"}</span>
        ${H && def.teams ? `<button class="mini" data-a="pvteam" data-v="${esc(s.id)}" title="팀 바꾸기">팀 ▸</button>` : ""}
        ${H && s.bot ? `<button class="mini" data-a="pvbotdiff" data-v="${esc(s.id)}">${BOT_DIFF[s.diff]}</button>` : ""}
        ${H && !s.me ? `<button class="mini warn" data-a="pvkick" data-v="${esc(s.id)}">${s.bot ? "빼기" : "내보내기"}</button>` : ""}
      </div>`;
    const full = slots.length >= MAX_PLAYERS;
    const cols = [];
    for (let t = 0; t < teams; t++) {
      const mine = slots.filter((s) => !def.teams || s.team === t);
      cols.push(`<div class="pvteam" style="--t:${def.teams ? TEAM_CSS[t] : "#9fb4c8"}"><div class="th">${def.teams ? TEAM_LABEL[t] : "참가자"} <span>${mine.length}</span></div>${mine.map(slot).join("")}
        ${H && !full ? `<button class="pvadd" data-a="pvaddbot" data-v="${def.teams ? t : ""}">+ 컴퓨터 추가</button>` : ""}</div>`);
    }
    const mapOpts = (Array.isArray(def.maps) ? def.maps.filter((id) => MAPS[id]) : MAP_LIST.map((m) => m.id)).map((id) => `<option value="${id}"${id === cfg.m ? " selected" : ""}>${esc(MAPS[id].name)}</option>`).join("");
    const times = (Array.isArray(def.time) ? def.time.map((t) => [t, `${Math.round(t / 60)}분`]) : TIMES);
    const seg = (k, opts, cur) => `<div class="seg">${opts.map(([val, l]) => `<button data-a="pvcfg" data-k="${k}" data-v="${val}" class="${String(cur) === String(val) ? "on" : ""}"${H ? "" : " disabled"}>${esc(l)}</button>`).join("")}</div>`;
    const sets = `<div class="pvsets">
        <div class="opt"><label>모드</label>${seg("o", Object.entries(PVP_MODES).map(([id, d]) => [id, d.name]), cfg.o)}</div>
        <div class="opt"><label>맵</label>${H ? `<select data-pvsel="m" aria-label="맵">${mapOpts}</select>` : `<b>${esc(MAPS[cfg.m].name)}</b>`}</div>
        <div class="opt"><label>제한 시간</label>${seg("t", times, cfg.t)}</div>
        ${def.teams && (def.teamCounts || [2]).length > 1 ? `<div class="opt"><label>팀 수</label>${seg("tn", def.teamCounts.map((n) => [n, `${n}팀`]), cfg.tn)}</div>` : ""}
        <div class="opt"><label>봇 채우기</label>${seg("bf", [[1, "켜기"], [0, "끄기"]], cfg.bf)}<div class="hint">빈자리를 보통 난이도 컴퓨터로 채웁니다 (6명까지)</div></div>
      </div>`;
    const me = slots.find((s) => s.me);
    const bar = H ? `<button class="primary" data-a="pvstart"${cfg.go ? " disabled" : ""}>${cfg.go ? "경기 진행 중" : "시작 →"}</button>`
      : `<button class="${me && me.ready ? "ghost on" : "primary"}" data-a="pvready">${me && me.ready ? "준비 취소" : "준비 완료"}</button>`;
    return `${msg}<div class="pvroomhd">
        <div><small>${cfg.au ? "랜덤 매칭" : c.offline ? "오프라인 연습" : "커스텀 방"}</small><h3>${esc(cfg.n)}</h3><span class="muted">${esc(def.name)} · ${esc(MAPS[cfg.m].name)} · ${Math.round(cfg.t / 60)}분${cfg.go ? " · 경기 진행 중" : ""}</span></div>
        ${c.offline ? "" : `<div class="pvcode" title="이 코드를 알려 주면 들어올 수 있습니다"><small>방 코드</small><b>${esc(cfg.c)}</b></div>`}
      </div>
      <div class="pvteams n${teams}">${cols.join("")}</div>
      ${sets}
      <div class="pvbar"><span class="muted">${H ? "방장: 팀·컴퓨터·설정을 정하고 시작하세요" : "방장이 시작하면 경기가 시작됩니다"} · ${slots.length}/${MAX_PLAYERS}</span><button class="ghost" data-a="pvleave">나가기</button>${bar}</div>`;
  },

  // ── 동작 ──
  a_pvview(v) { this._pv = v; this.show("pvp"); },
  a_pvq(v) { this.pvpClient().startQueue(v); this._pv = "queue"; this.show("pvp"); },
  a_pvqcancel() { this._pvc.cancelQueue(); this._pv = "hub"; this.show("pvp"); },
  a_pvsolo() { this._pvc.soloBots(); this._pv = "room"; this.show("pvp"); },
  a_pvoffline() { this.pvpClient().createOffline(); this._pv = "room"; this.show("pvp"); },
  a_pvcreate() { const n = this.root.querySelector("[data-pvrname]"); this._pvc.createRoom(n ? n.value : ""); this._pv = "room"; this.show("pvp"); },
  a_pvjoin(v) { this._pvc.joinRoom(v); this._pv = "room"; this.show("pvp"); },
  a_pvjoincode() { const el = this.root.querySelector("[data-pvcode]"); const v = el ? el.value : ""; if (String(v).replace(/[^A-Za-z0-9]/g, "").length < 4) { this._pvc.msg = "방 코드 4자리를 적어 주세요"; this._pvRefresh(); return; } this.a_pvjoin(v); },
  a_pvleave() { this._pvc.leaveRoom(); this._pv = this._pvc.tr ? "browse" : "hub"; this.show("pvp"); },
  a_pvcfg(v, el) { this._pvc.setCfg(el.dataset.k, el.dataset.k === "o" ? v : +v); },
  a_pvteam(v) { this._pvc.cycleTeam(v); },
  a_pvkick(v) { this._pvc.kick(v); },
  a_pvaddbot(v) { this._pvc.addBot(v === "" ? undefined : +v); },
  a_pvbotdiff(v) { this._pvc.cycleBotDiff(v); },
  a_pvready() { this._pvc.toggleReady(); },
  a_pvstart() { this._pvc.start(); this._pvRefresh(); },
  a_pvlobby() { this.game.quit(); },
  a_pvrequeue() { const c = this._pvc, m = c.cfg ? c.cfg.o : "ffa"; this.game.quit(); c.leaveRoom(); c.startQueue(m); this._pv = "queue"; this.show("pvp"); },
  a_pvexit() { const c = this._pvc; this.game.quit(); if (c) c.leaveRoom(); this._pv = "hub"; this.show("pvp"); },
  _pvBack() {
    const c = this._pvc, v = this._pv;
    if (v === "room") { c.leaveRoom(); this._pv = c.tr ? "browse" : "hub"; return this.show("pvp"); }
    if (v === "queue") { c.cancelQueue(); this._pv = "hub"; return this.show("pvp"); }
    if (v === "browse") { c.msg = ""; this._pv = "hub"; return this.show("pvp"); }
    this._group = "survival"; this.show("group");
  },
  // 경기에서 나왔을 때 (결과 화면 '대기실로' · 일시정지 '경기 나가기'): 커스텀 방이면 대기실, 랜덤 매칭이면 PVP 메뉴
  pvpAfterMatch() {
    const c = this.pvpClient();
    if (c.cfg && c.isHost) c.matchOver(`${c.cfg.c}:${c.cfg.st}`);
    if (c.inRoom() && c.cfg && !c.cfg.au) this._pv = "room";
    else { c.leaveRoom(); this._pv = "hub"; }
    this.show("pvp");
  },
};
