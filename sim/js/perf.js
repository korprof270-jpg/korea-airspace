// 성능 측정: 화면 왼쪽 위 작은 표시 + "측정 시작" 벤치마크
// 켜기: 설정 › HUD·효과 › 성능 표시, 또는 F3
// 벤치마크는 비행 중에 단계별로(기본 · 후처리 끔 · 해상도 절반 · 그림자 끔 · 시야 거리 절반) 몇 초씩 재서
// 어디가 병목인지(화면 해상도/후처리/그림자/물체 수/게임 계산) 한 줄로 알려 주고, 결과를 복사해 보낼 수 있게 한다
import { settings, save } from "./config.js";
import { Vector2 } from "../vendor/three.module.min.js";
const _sz = new Vector2();

const PHASES = [
  { id: "base", name: "기본" },
  { id: "nopost", name: "후처리 끔" },
  { id: "half", name: "해상도 절반" },
  { id: "noshadow", name: "그림자 끔" },
  { id: "near", name: "시야 거리 절반" },
  { id: "base", name: "기본(다시)", again: true },   // 처음과 비교해 발열·절전으로 점점 느려지는지 확인
];
const WARM = 1.0, MEASURE = 4.0;   // 단계마다 안정화 후 측정(초)

export class Perf {
  constructor(game) {
    this.game = game;
    this.on = !!settings.perfHud;
    this.win = [];          // 최근 1초 프레임 기록
    this.cur = null;        // 이번 프레임 측정값
    this.bench = null;
    this.report = "";
    this.el = document.createElement("div");
    this.el.id = "perfhud";
    this.el.innerHTML = `<pre></pre><div class="pb"><button data-p="run">측정 시작</button><button data-p="copy" hidden>결과 복사</button><button data-p="close">닫기</button></div>`;
    this.pre = this.el.querySelector("pre");
    this.el.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.el.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.p === "run") this.start();
      else if (b.dataset.p === "copy") this.copy();
      else if (b.dataset.p === "close") this.toggle(false);
    });
    document.body.appendChild(this.el);
    addEventListener("keydown", (e) => { if (e.code === "F3") { e.preventDefault(); this.toggle(); } });
    this._gpuInit();
    this.toggle(this.on, true);
  }

  toggle(v = !this.on, quiet = false) {
    this.on = v;
    this.el.hidden = !v;
    const info = this.game.renderer.info;
    info.autoReset = !v;            // 켜져 있으면 프레임 단위로 직접 0으로 (후처리가 여러 번 그려도 한 프레임 합계)
    if (settings.perfHud !== v && !quiet) { settings.perfHud = v; save(); }
    if (!v && this.bench) this._endBench(true);
  }

  // ── GPU 시간 (지원하는 기기만: EXT_disjoint_timer_query_webgl2) ──
  _gpuInit() {
    const gl = this.game.renderer.getContext();
    this.gl = gl;
    this.tq = gl.getExtension && gl.getExtension("EXT_disjoint_timer_query_webgl2");
    this.qs = [];   // 진행 중인 쿼리
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      this.gpuName = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (_) { this.gpuName = "?"; }
  }
  gpuBegin() {
    if (!this.on || !this.tq || this._q) return;
    const gl = this.gl, q = gl.createQuery();
    gl.beginQuery(this.tq.TIME_ELAPSED_EXT, q);
    this._q = q;
  }
  gpuEnd() {
    if (!this._q) return;
    const gl = this.gl;
    gl.endQuery(this.tq.TIME_ELAPSED_EXT);
    this.qs.push(this._q); this._q = null;
  }
  _gpuPoll() {
    const gl = this.gl;
    if (!this.tq || !this.qs.length) return null;
    let ms = null;
    const disjoint = gl.getParameter(this.tq.GPU_DISJOINT_EXT);
    while (this.qs.length) {
      const q = this.qs[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT);
      gl.deleteQuery(q); this.qs.shift();
      if (!disjoint) ms = ns / 1e6;
    }
    if (this.qs.length > 8) { for (const q of this.qs.splice(0, this.qs.length - 4)) gl.deleteQuery(q); }
    return ms;
  }

  // ── 프레임 ──
  frameStart() {
    if (!!settings.perfHud !== this.on) this.toggle(!!settings.perfHud, true);   // 설정 화면에서 켜고 끈 경우
    if (!this.on) return;
    this.game.renderer.info.reset();
    this.cur = { upd: 0, ren: 0 };
  }
  mark(k, ms) { if (this.cur) this.cur[k] += ms; }
  frameEnd(t, dtMs) {
    if (!this.on || !this.cur) return;
    const info = this.game.renderer.info, c = this.cur;
    c.t = t; c.dt = dtMs; c.calls = info.render.calls; c.tris = info.render.triangles;
    c.gpu = this._gpuPoll();   // 이번에 결과가 나온 GPU 시간(없으면 null — 평균에서 뺀다)
    this.win.push(c);
    while (this.win.length && t - this.win[0].t > 1000) this.win.shift();
    if (this.bench) this._benchFrame(c);
    if (!this._drawT || t - this._drawT > 250) { this._drawT = t; this._draw(); }
  }

  _stats(list) {
    if (!list.length) return null;
    const dts = list.map((x) => x.dt).sort((a, b) => a - b), avg = (k) => list.reduce((s, x) => s + (x[k] || 0), 0) / list.length;
    const gp = list.filter((x) => x.gpu != null);
    return {
      n: list.length, ms: avg("dt"), fps: 1000 / avg("dt"), p95: dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.95))], max: dts[dts.length - 1],
      hitch: list.filter((x) => x.dt > 50).length, upd: avg("upd"), ren: avg("ren"), gpu: gp.length ? gp.reduce((s, x) => s + x.gpu, 0) / gp.length : null,
      calls: Math.round(avg("calls")), tris: Math.round(avg("tris")),
    };
  }

  _env() {
    const g = this.game, r = g.renderer, sz = r.getDrawingBufferSize(_sz);
    const s = g.session;
    return { tier: g.q, set: settings.quality, pr: r.getPixelRatio(), w: sz.x, h: sz.y, post: !!g.composer, map: s ? s.map.name : "메뉴", mode: s ? s.cfg.mode : "-",
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, geo: r.info.memory.geometries, tex: r.info.memory.textures };
  }

  _draw() {
    const st = this._stats(this.win), e = this._env();
    if (!st) return;
    const f = (v, d = 1) => (v == null ? "-" : v.toFixed(d));
    let s = `FPS ${f(st.fps, 0)}  프레임 ${f(st.ms)}ms (95% ${f(st.p95)} / 최대 ${f(st.max, 0)})${st.hitch ? `  끊김 ${st.hitch}` : ""}\n`
      + `계산 ${f(st.upd)}ms  그리기 ${f(st.ren)}ms  GPU ${this.tq ? f(st.gpu) + "ms" : "측정 불가"}\n`
      + `그리기 호출 ${st.calls}  삼각형 ${(st.tris / 1000).toFixed(0)}k\n`
      + `품질 ${e.tier}(${e.set}) · 해상도 ${e.w}×${e.h} (×${e.pr.toFixed(2)}) · 후처리 ${e.post ? "켜짐" : "꺼짐"}${e.heap != null ? ` · 메모리 ${e.heap}MB` : ""}`;
    if (this.bench) s += `\n\n측정 중… ${this.bench.label}  (비행을 계속하세요)`;
    else if (this.report) s += "\n\n" + this.report;
    this.pre.textContent = s;
  }

  // ── 벤치마크 ──
  start() {
    const g = this.game;
    if (!g.session || g.state !== "play") { this.report = "비행 중에만 측정할 수 있습니다. 아무 맵에서 비행을 시작한 뒤 눌러 주세요."; this._draw(); return; }
    if (this.bench) return;
    this.report = "";
    this.el.querySelector('[data-p="copy"]').hidden = true;
    const s = g.session;
    this.bench = { i: -1, t: 0, res: [], frames: [], label: "", keep: { composer: g.composer, pr: g.renderer.getPixelRatio(), far: s.camera.far, shadowAuto: g.renderer.shadowMap.autoUpdate } };
    g._benching = true;
    this._next();
  }
  _apply(id) {
    const g = this.game, k = this.bench.keep, s = g.session, r = g.renderer;
    g.composer = k.composer; r.shadowMap.autoUpdate = k.shadowAuto;
    if (r.getPixelRatio() !== k.pr) { r.setPixelRatio(k.pr); g.resize(); }
    s.camera.far = k.far; s.camera.updateProjectionMatrix();
    if (id === "nopost") g.composer = null;
    if (id === "half") { r.setPixelRatio(k.pr * 0.5); g.resize(); }
    if (id === "noshadow") { r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false; }
    if (id === "near") { s.camera.far = k.far * 0.5; s.camera.updateProjectionMatrix(); }
  }
  _next() {
    const b = this.bench;
    if (b.i >= 0) b.res.push({ ph: PHASES[b.i], st: this._stats(b.frames) });
    b.i++;
    if (b.i >= PHASES.length) return this._endBench(false);
    // 후처리가 없는 품질(낮음)이면 그 단계는 건너뛴다
    if (PHASES[b.i].id === "nopost" && !b.keep.composer) return this._next();
    b.t = 0; b.frames = [];
    b.label = `${b.i + 1}/${PHASES.length} ${PHASES[b.i].name}`;
    this._apply(PHASES[b.i].id);
  }
  _benchFrame(c) {
    const b = this.bench, g = this.game;
    if (!g.session || g.state !== "play") return;   // 일시정지 중에는 시간을 세지 않는다
    b.t += c.dt / 1000;
    if (b.t > WARM) b.frames.push(c);
    if (b.t > WARM + MEASURE) this._next();
  }
  _endBench(cancel) {
    const g = this.game, b = this.bench;
    if (g.session) this._apply("base"); else g.composer = b.keep.composer;
    this.bench = null; g._benching = false;
    if (cancel) return;
    this.report = this._makeReport(b.res);
    this.el.querySelector('[data-p="copy"]').hidden = false;
    this._draw();
  }
  _makeReport(res) {
    const e = this._env(), f = (v, d = 1) => (v == null ? "-" : v.toFixed(d));
    const base = res.find((r) => r.ph.id === "base" && !r.ph.again);
    const lines = [`[FPV 성능 측정] ${e.map} · ${e.mode} · 품질 ${e.tier}(${e.set}) · ${e.w}×${e.h} ×${e.pr.toFixed(2)}`,
      `기기: ${navigator.hardwareConcurrency || "?"}코어 · 메모리 ${navigator.deviceMemory || "?"}GB · ${matchMedia("(pointer: coarse)").matches ? "터치" : "마우스"} · GPU ${this.gpuName || "?"}`,
      `브라우저: ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 110)}`];
    for (const r of res) {
      const s = r.st; if (!s) continue;
      const pc = base && base.st && r !== base && base.st.ms > 0 ? Math.round((1 - s.ms / base.st.ms) * 100) : null;
      const gain = pc == null ? "" : pc >= 0 ? `  (${pc}% 빨라짐)` : `  (${-pc}% 느려짐)`;
      lines.push(`- ${r.ph.name}: ${f(s.fps, 0)}fps ${f(s.ms)}ms (95% ${f(s.p95)}) 계산 ${f(s.upd)} 그리기 ${f(s.ren)} GPU ${f(s.gpu)} · 호출 ${s.calls} · 삼각형 ${(s.tris / 1000).toFixed(0)}k · 끊김 ${s.hitch}${gain}`);
    }
    lines.push("진단: " + this._diagnose(res));
    return lines.join("\n");
  }
  // 단계별로 얼마나 빨라졌는지로 병목을 고른다
  _diagnose(res) {
    const by = (id) => (res.find((r) => r.ph.id === id && !r.ph.again) || {}).st;
    const b1 = by("base"), b2 = (res.find((r) => r.ph.again) || {}).st;
    if (!b1) return "측정값 부족";
    const drift = b2 ? b2.ms / b1.ms : 1;
    // 기준: 처음·마지막 기본의 평균 (중간 단계 비교를 발열 흐름에 덜 휘둘리게)
    const b = b2 ? Object.assign({}, b1, { ms: (b1.ms + b2.ms) / 2, p95: Math.max(b1.p95, b2.p95), hitch: b1.hitch + b2.hitch }) : b1;
    if (drift > 1.25 || drift < 0.8) return `측정 중 기기 속도가 크게 바뀜(처음 ${b1.ms.toFixed(1)}ms → 마지막 ${b2.ms.toFixed(1)}ms) — 발열·절전·화면 갱신 제한 의심. 단계별 비교는 부정확하니, 기기를 식히고 '자동'이나 '보통' 품질로 다시 측정해 주세요`;
    if (b.upd + (b1.ren || 0) < b.ms * 0.25 && b.ms > 20) return `한 화면 처리(계산+그리기 ${(b.upd + b1.ren).toFixed(1)}ms)는 가벼운데 화면 간격이 ${b.ms.toFixed(1)}ms — 그래픽 부하보다 기기 쪽 제한(앱 안 브라우저 30fps 제한·절전·발열) 가능성이 큼`;
    if (b.ms < 18 && b.p95 < 25) return "충분히 부드러움 (60fps 근처) — 품질을 더 올릴 여유가 있음";
    const g = (id) => { const s = by(id); return s ? 1 - s.ms / b.ms : 0; };
    const cand = [["화면 해상도(픽셀 수)", g("half")], ["후처리(음영·외곽선·빛 번짐)", g("nopost")], ["그림자", g("noshadow")], ["먼 곳 물체(시야 거리)", g("near")]].sort((x, y) => y[1] - x[1]);
    const cpu = b.upd / b.ms;
    const out = [];
    if (cpu > 0.35) out.push(`게임 계산(CPU)이 프레임의 ${Math.round(cpu * 100)}% — 물리·AI·효과 계산 줄이기가 먼저`);
    if (cand[0][1] > 0.12) out.push(`가장 큰 병목: ${cand[0][0]} (끄면 ${Math.round(cand[0][1] * 100)}% 빨라짐)` + (cand[1][1] > 0.12 ? `, 다음: ${cand[1][0]} (${Math.round(cand[1][1] * 100)}%)` : ""));
    if (b.hitch > 2) out.push(`50ms 넘는 순간 끊김 ${b.hitch}회 — 셰이더 준비·메모리 정리 의심`);
    if (!out.length) out.push("뚜렷한 한 가지 병목 없음 — 그리기 호출·삼각형 수 전반을 줄여야 함 (맵 구역화)");
    return out.join(" / ");
  }

  async copy() {
    const t = this.report.split("\n※")[0];
    try { await navigator.clipboard.writeText(t); this._flash("복사했습니다. 대화창에 붙여 넣어 주세요."); }
    catch (_) {
      // 클립보드가 막힌 환경: 글자를 선택해 두어 길게 눌러 복사할 수 있게
      const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(this.pre); sel.removeAllRanges(); sel.addRange(rg);
      this._flash("자동 복사가 막혀 있어 글자를 선택해 두었습니다. 길게 눌러 복사해 주세요.");
    }
  }
  _flash(msg) { this.report = this.report.split("\n※")[0] + "\n※ " + msg; this._draw(); }
}
