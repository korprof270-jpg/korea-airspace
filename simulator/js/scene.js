// 드론 정비 시뮬레이터 — 3D 작업대: 부품 끌어다 붙이기, 선 끝을 눌러 연결하기, 카메라
(function () {
  const SIM = window.SIM, T = THREE;
  const sc = (SIM.scene = { xray: false, env: "bench", showExpect: false, dragDrone: false, poseName: "level", lift: 0, tumble: 0, pick: null, drag: null });
  const objs = (sc.objs = {});
  const K = (sc.K = 2.2); // 2종(7~25kg)급 기체 크기
  const ARM_R = 0.225, S2 = Math.SQRT1_2, REST_Y = 0.09 * K;
  // 부품별 모형 배율 (프레임 대비 잘 보이도록 키움)
  const PS = { motor: 2.0, prop: 1.2, esc: 1.4, fc: 1.5, pm: 1.4, battery: 1.3, gps: 1.4, rx: 1.5, telem: 1.5, buzzer: 1.8, switch: 1.8 };
  let renderer, scene, camera, drone, benchGroup, fieldGroup, partsRoot, wires, expectGroup, selBox, sun, snapRing, liveWire, stageEl;
  const air = {}, targets = [];
  const orbit = (sc.orbit = { theta: 0.45, phi: 0.92, dist: 2.2, target: new T.Vector3(0, 0.22, 0) });
  const poseQ = new T.Quaternion();
  sc.poseQ = poseQ;

  const mat = (color, o) => new T.MeshStandardMaterial(Object.assign({ color: new T.Color(color).convertSRGBToLinear(), roughness: 0.6, metalness: 0.1 }, o || {}));
  const M = {
    carbon: mat(0x22262a, { roughness: 0.45 }), red: mat(0xc8382e), white: mat(0xe9ecec), steel: mat(0xb9c0c4, { metalness: 0.8, roughness: 0.3 }),
    dark: mat(0x16181a), blue: mat(0x2b62c4), yellow: mat(0xe2b322), copper: mat(0xb86b2c, { metalness: 0.6, roughness: 0.4 }),
    prop: mat(0x2c2f33, { roughness: 0.35 }), green: mat(0x2f8a54), plug: mat(0xece6d2, { roughness: 0.7 }),
  };
  const HIT = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  function mesh(geo, m, x, y, z) {
    const o = new T.Mesh(geo, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }
  const box = (w, h, d, m, x, y, z) => mesh(new T.BoxGeometry(w, h, d), m, x, y, z);
  const cyl = (r, h, m, x, y, z, seg) => mesh(new T.CylinderGeometry(r, r, h, seg || 24), m, x, y, z);

  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  // 윗면 화살표 데칼 (캔버스 위쪽 = 기체 앞쪽)
  function arrowDecal(w, d, label, bg) {
    const tex = canvasTex(128, 192, (g, W, H) => {
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff";
      g.beginPath(); g.moveTo(W / 2, 14); g.lineTo(W - 26, 84); g.lineTo(W / 2 + 14, 84); g.lineTo(W / 2 + 14, 130); g.lineTo(W / 2 - 14, 130); g.lineTo(W / 2 - 14, 84); g.lineTo(26, 84); g.closePath(); g.fill();
      g.font = "bold 26px sans-serif"; g.textAlign = "center"; g.fillText(label, W / 2, 172);
    });
    const p = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    p.rotation.x = -Math.PI / 2;
    return p;
  }
  const texCache = {};
  function textSprite(lines, color) {
    const key = lines.join("|") + color;
    if (!texCache[key]) texCache[key] = canvasTex(256, 128, (g, W, H) => {
      g.fillStyle = "rgba(14,22,20,0.86)";
      const r = 22; g.beginPath(); g.moveTo(r, 4); g.arcTo(W - 4, 4, W - 4, H - 4, r); g.arcTo(W - 4, H - 4, 4, H - 4, r); g.arcTo(4, H - 4, 4, 4, r); g.arcTo(4, 4, W - 4, 4, r); g.fill();
      g.fillStyle = color || "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "bold " + (lines.length > 1 ? 40 : 52) + "px sans-serif";
      lines.forEach((l, i) => g.fillText(l, W / 2, (H * (i + 0.5)) / lines.length + (lines.length > 1 ? (i ? -4 : 4) : 0)));
    });
    const s = new T.Sprite(new T.SpriteMaterial({ map: texCache[key], depthTest: false, transparent: true }));
    s.scale.set(0.11, 0.055, 1); s.renderOrder = 10;
    return s;
  }

  // ---------- 선 끝(납땜 팁·커넥터)과 연결 대상 ----------
  const LEAD = { y: mat(0xe0c020), b: mat(0x2c6fd0), g: mat(0x2f9a4a), r: mat(0xc8281e), k: mat(0x161616), w: mat(0xf2f2f2), o: mat(0xe88a20), v: mat(0x8a5ad0), l: mat(0x3a78d8) };
  // 부품 모형에 선을 붙이고, 끝을 누를 수 있게 등록한다
  function lead(o, key, from, to, m, r, plug) {
    const g = o.group, rr = r || 0.0011;
    const curve = new T.CatmullRomCurve3([new T.Vector3(...from), new T.Vector3((from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 0.002, (from[2] + to[2]) / 2), new T.Vector3(...to)]);
    const t = new T.Mesh(new T.TubeGeometry(curve, 8, rr, 5), m); t.castShadow = true; g.add(t);
    g.add(plug ? box(rr * 4.5, rr * 2.6, rr * 3.5, M.plug, to[0], to[1], to[2]) : cyl(rr * 1.35, 0.003, M.steel, to[0], to[1], to[2], 6));
    const h = new T.Mesh(new T.SphereGeometry(0.0065, 8, 6), HIT); h.position.set(...to); h.userData.tip = { part: o.id, key }; g.add(h);
    o.tips[key] = new T.Vector3(...to);
  }
  function target(parent, mesh, info) { mesh.userData.target = info; targets.push(mesh); parent.add(mesh); return mesh; }
  // 위에서 본 회전 방향 화살표 (모터 벨 윗면 인쇄)
  function spinArrow(dir) {
    const tex = canvasTex(128, 128, (g, W) => {
      g.clearRect(0, 0, W, W); g.strokeStyle = "#f4f4f4"; g.fillStyle = "#f4f4f4"; g.lineWidth = 9;
      const c = W / 2, r = 42, ccw = dir === "ccw", a0 = ccw ? 0.35 : Math.PI - 0.35, a1 = ccw ? Math.PI * 1.55 : -Math.PI * 0.55;
      g.beginPath(); g.arc(c, c, r, a0, a1, ccw); g.stroke();
      const ex = c + r * Math.cos(a1), ey = c + r * Math.sin(a1), tg = ccw ? a1 - Math.PI / 2 : a1 + Math.PI / 2;
      g.beginPath(); g.moveTo(ex + 18 * Math.cos(tg), ey + 18 * Math.sin(tg)); g.lineTo(ex + 14 * Math.cos(tg + 2.3), ey + 14 * Math.sin(tg + 2.3)); g.lineTo(ex + 14 * Math.cos(tg - 2.3), ey + 14 * Math.sin(tg - 2.3)); g.closePath(); g.fill();
    });
    const p = new T.Mesh(new T.PlaneGeometry(0.026, 0.026), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; return p;
  }

  // FC 윗면 포트 위치 (FC 모형 좌표, 앞쪽 = -z)
  const FC_PORT = { "RC IN": [-0.022, 0.009, 0.043], "SBUS OUT": [0.022, 0.009, 0.043], POWER: [-0.012, 0.012, -0.04], GPS: [0.012, 0.012, -0.04], "SERIAL 4/5": [0, 0.012, -0.04], TELEM1: [0.023, 0.014, -0.026], TELEM2: [0.023, 0.014, -0.006], I2C: [-0.023, 0.014, -0.006], CAN: [-0.023, 0.014, -0.026], SWITCH: [0.019, 0.014, -0.036], BUZZER: [-0.019, 0.014, -0.036], "SPKT/DSM": [-0.023, 0.014, 0.014], "ADC 3.3V": [0.023, 0.014, 0.014], "ADC 6.6V": [0.023, 0.014, 0.028], SPI: [-0.023, 0.014, 0.028], USB: [-0.025, 0.007, 0] };
  for (let n = 1; n <= 8; n++) FC_PORT["MAIN OUT " + n] = [(n - 4.5) * 0.0045, 0.008, 0.043];
  for (let n = 1; n <= 6; n++) FC_PORT["AUX OUT " + n] = [(n - 3.5) * 0.0045, 0.013, 0.043];

  // ---------- 부품 모형 (원점 = 장착면 중앙, 안쪽/뒤쪽 = -z) ----------
  function makePart(part) {
    const g = new T.Group(), o = { group: g, id: part.id, tips: {}, pads: {} };
    g.userData.partId = part.id;
    objs[part.id] = o;
    if (part.type === "motor") {
      g.add(cyl(0.0135, 0.008, M.dark, 0, 0.004, 0));
      const bell = new T.Group();
      bell.add(cyl(0.014, 0.016, M.steel, 0, 0.017, 0), cyl(0.0141, 0.003, M.dark, 0, 0.0235, 0));
      bell.add(cyl(0.0025, 0.012, M.steel, 0, 0.03, 0, 10));
      // 축 나사 방향에 따라 너트 색이 다르다 (검정 / 은색)
      bell.add(cyl(0.0055, 0.004, part.thread === "cw" ? M.dark : M.steel, 0, 0.0345, 0, 6));
      const ar = spinArrow(part.thread); ar.position.y = 0.0252; bell.add(ar);
      ["y", "b", "g"].forEach((c, k) => lead(o, "ph" + (k + 1), [(k - 1) * 0.004, 0.004, -0.012], [(k - 1) * 0.006, 0.003, -0.021], LEAD[c], 0.0011));
      g.add(bell); o.spinner = bell;
    } else if (part.type === "prop") {
      const sp = new T.Group(), pitch = part.dir === "ccw" ? 0.3 : -0.3;
      const geo = new T.BoxGeometry(0.11, 0.0026, 0.03);
      const b1 = mesh(geo, M.prop, 0.064, 0.004, 0); b1.rotation.x = pitch;
      const b2 = mesh(geo, M.prop, -0.064, 0.004, 0); b2.rotation.x = -pitch;
      sp.add(b1, b2, cyl(0.009, 0.008, M.dark, 0, 0.004, 0), cyl(0.0062, 0.001, M.white, 0, 0.0084, 0), box(0.03, 0.0006, 0.005, M.white, 0.04, 0.0056, 0), box(0.03, 0.0006, 0.005, M.white, -0.04, 0.0056, 0));
      const disc = new T.Mesh(new T.CircleGeometry(0.12, 40), new T.MeshBasicMaterial({ color: 0x9aa6a8, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004;
      g.add(sp, disc); o.spinner = sp; o.disc = disc;
    } else if (part.type === "esc") {
      g.add(box(0.024, 0.008, 0.048, M.blue, 0, 0.004, 0), box(0.018, 0.0012, 0.02, M.yellow, 0, 0.0086, -0.004));
      ["A", "B", "C"].forEach((p, k) => { const pd = box(0.005, 0.0016, 0.006, M.copper, (k - 1) * 0.007, 0.0088, 0.019); g.add(pd); o.pads[p] = new T.Vector3((k - 1) * 0.007, 0.0096, 0.019); target(g, mesh(new T.BoxGeometry(0.0068, 0.006, 0.009), HIT, (k - 1) * 0.007, 0.0096, 0.019), { kind: "escPad", part: part.id, pad: p, label: "ESC 단자 " + p }); });
      lead(o, "pwrR", [-0.007, 0.004, -0.024], [-0.009, 0.003, -0.036], LEAD.r, 0.0019);
      lead(o, "pwrK", [-0.003, 0.004, -0.024], [-0.004, 0.003, -0.036], LEAD.k, 0.0019);
      lead(o, "sig", [0.0035, 0.005, -0.024], [0.0045, 0.004, -0.034], LEAD.w, 0.0009, true);
      lead(o, "tel", [0.008, 0.005, -0.024], [0.01, 0.004, -0.032], LEAD.o, 0.0008, true);
    } else if (part.type === "fc") {
      const body = box(0.05, 0.015, 0.082, M.dark, 0, 0.0075, 0); g.add(body);
      target(g, mesh(new T.BoxGeometry(0.052, 0.018, 0.084), HIT, 0, 0.0075, 0), { kind: "fc", part: part.id, label: "비행 컨트롤러" });
      const d = arrowDecal(0.04, 0.05, "FC", "#1b1e22"); d.position.set(0, 0.0152, 0.004); g.add(d);
      g.add(box(0.044, 0.006, 0.005, M.plug, 0, 0.009, 0.042)); // 뒤쪽 서보 레일
      for (const p of ["POWER", "GPS", "SERIAL 4/5", "TELEM1", "TELEM2", "I2C", "CAN", "SWITCH", "BUZZER", "SPKT/DSM", "ADC 3.3V", "ADC 6.6V", "SPI"]) { const v = FC_PORT[p]; g.add(box(0.0062, 0.0024, 0.0042, M.plug, v[0], 0.0158, v[2])); }
    } else if (part.type === "pm") {
      g.add(box(0.022, 0.009, 0.05, M.dark, 0, 0.0045, 0));
      g.add(box(0.016, 0.009, 0.012, M.yellow, 0, 0.0045, 0.03));
      target(g, mesh(new T.BoxGeometry(0.02, 0.014, 0.016), HIT, 0, 0.0045, 0.03), { kind: "pmIn", part: part.id, label: "파워 모듈 입력 커넥터" });
      o.pads.in = new T.Vector3(0, 0.0045, 0.037);
      lead(o, "fc", [-0.006, 0.006, -0.025], [-0.008, 0.005, -0.04], LEAD.r, 0.0009, true);
      lead(o, "outR", [0.003, 0.005, -0.025], [0.004, 0.004, -0.04], LEAD.r, 0.0019);
      lead(o, "outK", [0.008, 0.005, -0.025], [0.009, 0.004, -0.04], LEAD.k, 0.0019);
    } else if (part.type === "battery") {
      g.add(box(0.046, 0.034, 0.135, M.blue, 0, 0.017, 0), box(0.0465, 0.012, 0.136, M.dark, 0, 0.017, 0));
      lead(o, "xt", [0.012, 0.026, 0.068], [0.012, 0.042, 0.084], LEAD.r, 0.0024, true);
    } else if (part.type === "gps") {
      g.add(cyl(0.003, 0.07, M.carbon, 0, 0.035, 0, 8), cyl(0.012, 0.003, M.carbon, 0, 0.0015, 0), cyl(0.03, 0.012, M.dark, 0, 0.076, 0, 32));
      const d = arrowDecal(0.03, 0.045, "GPS", "#1b1e22"); d.position.y = 0.0822; g.add(d);
      lead(o, "gps", [0.003, 0.003, -0.006], [0.008, 0.003, -0.022], LEAD.l, 0.0009, true);
      lead(o, "compass", [-0.003, 0.003, -0.006], [-0.008, 0.003, -0.022], LEAD.v, 0.0008, true);
    } else if (part.type === "rx") {
      g.add(box(0.024, 0.01, 0.04, mat(0x3a3f45), 0, 0.005, 0), box(0.02, 0.0006, 0.012, M.white, 0, 0.0104, 0));
      const a1 = cyl(0.0008, 0.07, M.dark, -0.006, 0.03, 0.022, 6); a1.rotation.x = 0.5;
      const a2 = cyl(0.0008, 0.07, M.dark, 0.006, 0.03, 0.022, 6); a2.rotation.x = 0.5; a2.rotation.z = -0.5;
      g.add(a1, a2);
      lead(o, "sig", [0, 0.005, -0.02], [0, 0.004, -0.032], LEAD.g, 0.0009, true);
    } else if (part.type === "buzzer") {
      g.add(cyl(0.008, 0.007, M.dark, 0, 0.0035, 0), cyl(0.002, 0.0005, M.steel, 0, 0.0072, 0, 8));
      lead(o, "fc", [0, 0.003, -0.008], [0, 0.003, -0.018], LEAD.k, 0.0008, true);
    } else if (part.type === "switch") {
      g.add(box(0.014, 0.008, 0.014, M.dark, 0, 0.004, 0), cyl(0.0045, 0.004, M.red, 0, 0.01, 0, 16));
      lead(o, "fc", [0, 0.003, -0.007], [0, 0.003, -0.018], LEAD.r, 0.0008, true);
    } else if (part.type === "telem") {
      g.add(box(0.024, 0.01, 0.046, M.green, 0, 0.005, 0), cyl(0.003, 0.075, M.dark, 0, 0.045, 0.02, 8));
      lead(o, "fc", [0, 0.005, -0.023], [0, 0.004, -0.034], LEAD.y, 0.0009, true);
    }
    g.scale.setScalar(PS[part.type] || 1);
    return g;
  }

  // PDB 패드 위치 (기체 기준 x, z)
  const PADS = { batt: { plus: [-0.014, 0.088], minus: [0.014, 0.088] } };
  for (const id of SIM.POS_IDS) { const p = SIM.POS[id], dx = p.x * S2, dz = p.z * S2; PADS[id] = { plus: [dx * 0.088 - dz * 0.027, dz * 0.088 + dx * 0.027], minus: [dx * 0.088 + dz * 0.027, dz * 0.088 - dx * 0.027] }; }
  const HARNESS = [-0.048, 0.0015, -0.03];
  const harnessObj = { group: null, id: "harness", tips: {}, pads: {} };

  function buildFrame() {
    const g = new T.Group();
    const plate = (w, d, y) => { const p = mesh(new T.CylinderGeometry(0.5, 0.5, 0.003, 8), M.carbon, 0, y, 0); p.scale.set(w * 1.08, 1, d * 1.08); p.rotation.y = Math.PI / 8; return p; };
    const topP = plate(0.21, 0.24, 0.0385); topP.material = M.carbon.clone(); topP.material.transparent = true; sc.topPlate = topP;
    g.add(plate(0.21, 0.21, -0.0015), topP);
    // 하판 일체형 배전판(PDB): 구리 패드와 +/− 인쇄
    const pcb = mesh(new T.CylinderGeometry(0.5, 0.5, 0.0006, 8), mat(0x143d2c, { roughness: 0.5 }), 0, 0.0004, 0); pcb.scale.set(0.2 * 1.08, 1, 0.2 * 1.08); pcb.rotation.y = Math.PI / 8; pcb.castShadow = false; g.add(pcb);
    const silk = (ch) => { const p = new T.Mesh(new T.PlaneGeometry(0.011, 0.011), new T.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { c.fillStyle = "#143d2c"; c.fillRect(0, 0, 64, 64); c.fillStyle = "#fff"; c.font = "bold 58px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, 32, 34); }) })); p.rotation.x = -Math.PI / 2; return p; };
    for (const key in PADS) for (const sgn of ["plus", "minus"]) {
      const a = PADS[key][sgn];
      g.add(box(0.014, 0.0012, 0.014, sgn === "plus" ? M.copper : M.steel, a[0], 0.001, a[1]));
      target(g, mesh(new T.BoxGeometry(0.016, 0.008, 0.016), HIT, a[0], 0.003, a[1]), { kind: "pdb", group: key, sign: sgn, label: "PDB " + (sgn === "plus" ? "＋" : "－") + " 패드" });
      const s = silk(sgn === "plus" ? "+" : "−"), k = 1 + 0.016 / Math.hypot(a[0], a[1]);
      s.position.set(a[0] * k, 0.0011, a[1] * k); g.add(s);
    }
    // ESC 통신선 하네스 (하판 위 작은 커넥터 보드)
    const hb = new T.Group(); hb.position.set(...HARNESS); g.add(hb);
    hb.add(box(0.02, 0.006, 0.012, M.plug, 0, 0.003, 0));
    target(hb, mesh(new T.BoxGeometry(0.024, 0.012, 0.016), HIT, 0, 0.003, 0), { kind: "harness", label: "ESC 통신선 하네스" });
    harnessObj.group = hb;
    lead(harnessObj, "fc", [0, 0.004, -0.006], [0.004, 0.006, -0.022], LEAD.o, 0.0009, true);
    for (const id of SIM.POS_IDS) {
      const p = SIM.POS[id], a = new T.Group();
      a.rotation.y = Math.atan2(p.x, p.z);
      a.add(box(0.03, 0.016, 0.2, p.z < 0 ? M.red : M.white, 0, 0.002, 0.14));
      a.add(cyl(0.03, 0.004, M.carbon, 0, 0.008, ARM_R));
      const leg = box(0.008, 0.094, 0.014, M.carbon, 0, -0.045, 0.165); leg.rotation.x = 0.12; a.add(leg);
      a.add(box(0.02, 0.006, 0.03, M.dark, 0, -0.088, 0.17));
      g.add(a);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.003, 0.038, M.steel, sx * 0.06, 0.018, sz * 0.078, 8));
    // 마스트 받침
    g.add(cyl(0.006, 0.003, M.carbon, 0, 0.0415, 0.09));
    return g;
  }

  // ---------- 장착 자리 (기체 기준 위치·방향) ----------
  const DECKPOS = { "deck:C": [0, 0.04, -0.012], "deck:L": [-0.077, 0.04, -0.035], "deck:R": [0.077, 0.04, -0.035], "deck:RL": [-0.074, 0.04, 0.058], "deck:RR": [0.074, 0.04, 0.058], mast: [0, 0.043, 0.09], "bot:C": [0, 0.0015, 0.004], under: [0, -0.047, 0] };
  function slotXform(slot, part) {
    const [t, pos] = slot.split("@"), st = SIM.state;
    if (pos) {
      const p = SIM.POS[pos], ry = Math.atan2(p.x, p.z);
      if (t === "motor") return { p: [p.x * ARM_R * S2, 0.01, p.z * ARM_R * S2], ry };
      if (t === "prop") { const fl = part && st.flip[part.id]; return { p: [p.x * ARM_R * S2, fl ? 0.093 : 0.085, p.z * ARM_R * S2], ry: 0, rx: fl ? Math.PI : 0 }; }
      return { p: [p.x * 0.093 * S2, 0.01, p.z * 0.093 * S2], ry };
    }
    const ry = part && (part.type === "fc" || part.type === "gps") ? (-st.rot[part.type] * Math.PI) / 2 : 0;
    return { p: DECKPOS[slot], ry };
  }
  // 작업대 위 기본 보관 위치 (partsRoot 좌표)
  function homeOf(part) {
    const b = SIM.state.bench[part.id];
    if (b) return { p: [b[0], 0, b[1]], ry: 0 };
    const n = +(part.id.match(/\d+$/) || [1])[0] - 1;
    if (part.type === "motor") return { p: [-0.62, 0, -0.27 + n * 0.11], ry: 0 };
    if (part.type === "esc") return { p: [-0.49, 0, -0.27 + n * 0.11], ry: 0 };
    if (part.type === "prop") return { p: [0.58, 0, -0.3 + n * 0.1], ry: 0 };
    const row = { fc: -0.36, pm: -0.24, battery: -0.12, gps: 0.02, rx: 0.13, telem: 0.23, buzzer: 0.32, switch: 0.4 };
    return { p: [row[part.type], 0, 0.4], ry: 0 };
  }
  const xfQuat = (x) => new T.Quaternion().setFromEuler(new T.Euler(x.rx || 0, x.ry, 0, "YXZ"));

  // ---------- 배선 그리기 ----------
  function tube(points, color, r) {
    const curve = new T.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new T.Vector3(p[0], p[1], p[2]))));
    const m = new T.Mesh(new T.TubeGeometry(curve, 24, r || 0.0013, 5), mat(color, { roughness: 0.8 }));
    m.castShadow = true;
    return m;
  }
  // 부품 좌표 → 기체 좌표 (장착된 목표 위치 기준이라 움직이는 중에도 선이 맞는다)
  function toDrone(o, v) {
    if (o === harnessObj) return v.clone().add(new T.Vector3(...HARNESS));
    const g = o.group, s = g.scale.x;
    return v.clone().multiplyScalar(s).applyQuaternion(g.userData.tq).add(g.userData.tp);
  }
  const tipPos = (id, key) => (id === "harness" ? toDrone(harnessObj, harnessObj.tips[key]) : toDrone(objs[id], objs[id].tips[key]));
  const padPos = (key, sgn) => new T.Vector3(PADS[key][sgn][0], 0.002, PADS[key][sgn][1]);
  const fcPortPos = (port) => toDrone(objs.fc, new T.Vector3(...(FC_PORT[port] || [0, 0.014, 0])));
  function link(a, b, color, r) {
    const lift = Math.max(a.y, b.y) + 0.014;
    wires.add(tube([a, new T.Vector3(a.x + (b.x - a.x) * 0.15, lift, a.z + (b.z - a.z) * 0.15), new T.Vector3(a.x + (b.x - a.x) * 0.85, lift, a.z + (b.z - a.z) * 0.85), b], color, r));
  }
  // 케이블 이름 → 선 끝 (부품, 팁)
  sc.cableTip = (c) => {
    if (c === "escTelem") return ["harness", "fc"];
    if (/^esc[A-Z]{2}$/.test(c)) { const p = SIM.partAt("esc@" + c.slice(3)); return p ? [p.id, "sig"] : null; }
    return { pm: ["pm", "fc"], gps: ["gps", "gps"], compass: ["gps", "compass"], telem: ["telem", "fc"], buzzer: ["buzzer", "fc"], switch: ["switch", "fc"], rx: ["rx", "sig"] }[c];
  };
  const CABLE_COL = { pm: 0xc8281e, gps: 0x3a78d8, compass: 0x8a5ad0, telem: 0xe0c020, buzzer: 0x202020, switch: 0xc8281e, rx: 0x2f9a4a, escTelem: 0xe88a20 };
  function rebuildWires() {
    while (wires.children.length) { const c = wires.children.pop(); c.geometry.dispose(); }
    const w = SIM.state.wiring, fcIn = SIM.has("fc"), RED = 0xc8281e, BLK = 0x161616;
    for (const id of SIM.POS_IDS) {
      const escP = SIM.partAt("esc@" + id), mot = SIM.partAt("motor@" + id);
      if (!escP) continue;
      if (mot) for (let k = 1; k <= 3; k++) { const pad = w.motorWires[id][k]; if (pad) link(tipPos(mot.id, "ph" + k), toDrone(objs[escP.id], objs[escP.id].pads[pad]), [0xe0c020, 0x2c6fd0, 0x2f9a4a][k - 1], 0.0015); }
      if (w.escPwr[id]) { const rv = w.escPwr[id] === "rev"; link(tipPos(escP.id, "pwrR"), padPos(id, rv ? "minus" : "plus"), RED, 0.0021); link(tipPos(escP.id, "pwrK"), padPos(id, rv ? "plus" : "minus"), BLK, 0.0021); }
      if (w.escTelem[id] === "harness") link(tipPos(escP.id, "tel"), new T.Vector3(...HARNESS).add(new T.Vector3(0, 0.006, 0)), 0xe88a20, 0.0009);
    }
    if (fcIn) for (const c in w.plug) {
      if (!w.plug[c] || !SIM.cableReady(c)) continue;
      const t = sc.cableTip(c); if (!t) continue;
      link(tipPos(t[0], t[1]), fcPortPos(w.plug[c]), /^esc[A-Z]/.test(c) ? 0xf2f2f2 : CABLE_COL[c], 0.0013);
    }
    if (SIM.has("pm") && w.pmOut) { const rv = w.pmOut === "rev"; link(tipPos("pm", "outR"), padPos("batt", rv ? "minus" : "plus"), RED, 0.0021); link(tipPos("pm", "outK"), padPos("batt", rv ? "plus" : "minus"), BLK, 0.0021); }
    if (SIM.has("battery") && w.batt === "pm" && SIM.has("pm")) link(tipPos("battery", "xt"), toDrone(objs.pm, objs.pm.pads.in), RED, 0.003);
    if (SIM.has("battery") && w.batt === "pdb") { link(tipPos("battery", "xt"), padPos("batt", "plus"), RED, 0.0026); link(tipPos("battery", "xt"), padPos("batt", "minus"), BLK, 0.0026); }
  }

  function rebuildExpect() {
    while (expectGroup.children.length) expectGroup.remove(expectGroup.children[0]);
    if (!sc.showExpect) return;
    const f = SIM.frame();
    f.order.forEach((n, i) => {
      const m = f.motors[n], k = m.x && m.z ? S2 : 1;
      const s = textSprite(["모터 " + n + " (" + "ABCD"[i] + ")", m.spin === "cw" ? "↻ CW" : "↺ CCW"], "#ffd45e");
      s.position.set(m.x * ARM_R * k, 0.2, m.z * ARM_R * k);
      expectGroup.add(s);
    });
  }

  // 상태 → 3D 반영
  sc.sync = function () {
    for (const part of SIM.PARTS) {
      if (sc.drag && sc.drag.id === part.id && sc.drag.active) continue;
      const o = objs[part.id], g = o.group, slot = SIM.state.install[part.id];
      const x = slot ? slotXform(slot, part) : homeOf(part), parent = slot ? drone : partsRoot;
      if (g.parent !== parent) parent.attach(g);
      g.userData.tp = new T.Vector3(x.p[0], x.p[1], x.p[2]);
      g.userData.tq = xfQuat(x);
    }
    rebuildWires(); rebuildExpect();
    const sel = SIM.selected && objs[SIM.selected];
    selBox.visible = !!sel && sc.env === "bench";
    if (sel) selBox.setFromObject(sel.group);
  };

  sc.setEnv = function (env) {
    sc.env = env;
    benchGroup.visible = partsRoot.visible = env === "bench";
    fieldGroup.visible = env === "field";
    sc.cancelPick();
    applyTheme();
    if (env === "bench") { orbit.target.set(0, 0.22, 0); orbit.dist = 2.2; sc.setPose("level"); drone.position.set(0, REST_Y, 0); drone.quaternion.identity(); }
    else { orbit.dist = 6; orbit.phi = 1.25; orbit.theta = 0.25; }
    sc.sync();
  };

  // 손으로 기체를 놓는 자세 (가속도계 교정용)
  const POSES = { level: [0, 0, 0], left: [0, 0, Math.PI / 2], right: [0, 0, -Math.PI / 2], nosedown: [-Math.PI / 2, 0, 0], noseup: [Math.PI / 2, 0, 0], back: [0, 0, Math.PI] };
  sc.setPose = function (name) {
    sc.poseName = name;
    const e = POSES[name];
    poseQ.setFromEuler(new T.Euler(e[0], e[1], e[2]));
    sc.lift = name === "level" ? 0 : 0.75;
  };
  sc.setTilt = function (rollDeg, pitchDeg) { // 센서 테스트용: 오른쪽 롤 +, 기수 들림 +
    poseQ.setFromEuler(new T.Euler((pitchDeg * Math.PI) / 180, 0, (-rollDeg * Math.PI) / 180, "YXZ"));
    sc.poseName = "free"; sc.lift = rollDeg || pitchDeg ? 0.45 : 0;
  };

  function applyTheme() {
    const cs = getComputedStyle(document.documentElement);
    const c = cs.getPropertyValue(sc.env === "field" ? "--sky" : "--scene").trim() || "#dfe6e4";
    scene.background = new T.Color(c);
    scene.fog = sc.env === "field" ? new T.Fog(c, 60, 220) : null;
  }

  // ---------- 초기화 ----------
  sc.init = function (canvas) {
    stageEl = canvas.parentElement;
    renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    camera = sc.camera = new T.PerspectiveCamera(42, 1, 0.02, 400);
    scene.add(new T.HemisphereLight(0xffffff, 0x556060, 0.85));
    sun = new T.DirectionalLight(0xffffff, 0.9);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 16 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // 작업대
    benchGroup = new T.Group();
    const top = box(4.0, 0.08, 2.9, mat(0x8a6646, { roughness: 0.8 }), 0, -0.044, 0); top.castShadow = false;
    const matTex = canvasTex(1024, 640, (g, W, H) => {
      g.fillStyle = "#1d6b55"; g.fillRect(0, 0, W, H);
      for (let i = 0; i <= 36; i++) { g.strokeStyle = i % 5 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.34)"; g.lineWidth = i % 5 ? 1 : 2; g.beginPath(); g.moveTo((i * W) / 36, 0); g.lineTo((i * W) / 36, H); g.stroke(); }
      for (let i = 0; i <= 22; i++) { g.strokeStyle = i % 5 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.34)"; g.lineWidth = i % 5 ? 1 : 2; g.beginPath(); g.moveTo(0, (i * H) / 22); g.lineTo(W, (i * H) / 22); g.stroke(); }
    });
    const pad = mesh(new T.BoxGeometry(3.4, 0.004, 2.4), new T.MeshStandardMaterial({ map: matTex, roughness: 0.9 }), 0, -0.002, 0); pad.castShadow = false;
    benchGroup.add(top, pad);
    scene.add(benchGroup);

    // 시험장
    fieldGroup = new T.Group();
    const ground = mesh(new T.PlaneGeometry(600, 600), mat(0x6f9a63, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    const grid = new T.GridHelper(200, 100, 0xffffff, 0xffffff); grid.material.opacity = 0.18; grid.material.transparent = true; grid.position.y = 0.004;
    const padTex = canvasTex(256, 256, (g) => { g.fillStyle = "#30363a"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = "#ffd45e"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke(); g.fillStyle = "#fff"; g.font = "bold 130px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 128, 136); });
    const hp = new T.Mesh(new T.PlaneGeometry(3, 3), new T.MeshStandardMaterial({ map: padTex, transparent: true, roughness: 0.9 })); hp.rotation.x = -Math.PI / 2; hp.position.y = 0.006; hp.receiveShadow = true;
    fieldGroup.add(ground, grid, hp);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r = i % 2 ? 10 : 5; const cone = mesh(new T.ConeGeometry(0.12, 0.4, 12), mat(0xe8672c), Math.sin(a) * r, 0.2, Math.cos(a) * r); fieldGroup.add(cone); }
    for (const z of [-20, -40]) fieldGroup.add(box(0.15, 4, 0.15, M.white, 0, 2, z), box(1.2, 0.5, 0.05, M.red, 0, 3.6, z));
    fieldGroup.visible = false;
    scene.add(fieldGroup);

    drone = new T.Group(); sc.drone = drone;
    drone.position.set(0, REST_Y, 0); drone.scale.setScalar(K);
    drone.add(buildFrame());
    wires = new T.Group(); expectGroup = new T.Group();
    drone.add(wires, expectGroup);
    partsRoot = new T.Group(); partsRoot.scale.setScalar(K);
    scene.add(drone, partsRoot);
    for (const part of SIM.PARTS) { const g = makePart(part), h = homeOf(part); g.position.set(h.p[0], h.p[1], h.p[2]); partsRoot.add(g); }
    // 프로펠러 바람(공기 흐름) 표시
    for (const id of SIM.POS_IDS) {
      const g = new T.Group(); g.position.set(SIM.POS[id].x * ARM_R * S2, 0.088, SIM.POS[id].z * ARM_R * S2); drone.add(g);
      const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.03 + (i % 6) * 0.02; const st = new T.Mesh(new T.BoxGeometry(0.003, 0.03, 0.003), m); st.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); st.userData.ph = i / 12; g.add(st); }
      air[id] = { g, m };
    }
    selBox = new T.BoxHelper(drone, 0xffb020); selBox.visible = false; scene.add(selBox);
    snapRing = new T.Mesh(new T.TorusGeometry(0.05, 0.004, 8, 40), new T.MeshBasicMaterial({ color: 0xffd45e, depthTest: false, transparent: true, opacity: 0.9 }));
    snapRing.rotation.x = -Math.PI / 2; snapRing.renderOrder = 20; snapRing.visible = false; scene.add(snapRing);

    applyTheme();
    try {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
      new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) {}
    bindPointer(canvas);
    const resize = () => { const w = stageEl.clientWidth || 300, h = stageEl.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    try { new ResizeObserver(resize).observe(stageEl); } catch (e) { window.addEventListener("resize", resize); }
    resize();
    sc.sync();
    SIM.on(sc.sync);
  };

  // ---------- 화면 좌표 ----------
  const _v = new T.Vector3();
  function toScreen(world) {
    _v.copy(world).project(camera);
    return { x: ((_v.x + 1) / 2) * stageEl.clientWidth, y: ((1 - _v.y) / 2) * stageEl.clientHeight, vis: _v.z < 1 };
  }
  sc.screenOf = (id) => { const g = objs[id].group, b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3()); c.y = b.max.y; return toScreen(c); };

  // ---------- 선 연결 ----------
  // 지금 이 선 끝이 연결된 상태를 끊는다
  function disconnect(tip) {
    const w = SIM.state.wiring, id = tip.part, k = tip.key, slot = SIM.state.install[id] || "", pos = slot.split("@")[1];
    if (id === "harness") w.plug.escTelem = "";
    else if (/^ph\d$/.test(k)) w.motorWires[pos][k[2]] = "";
    else if (k === "pwrR" || k === "pwrK") w.escPwr[pos] = "";
    else if (k === "tel") w.escTelem[pos] = "";
    else if (k === "outR" || k === "outK") w.pmOut = "";
    else if (k === "xt") w.batt = "";
    else { const c = tipCable(tip); if (c) w.plug[c] = ""; }
  }
  function tipCable(tip) {
    if (tip.part === "harness") return "escTelem";
    const part = SIM.part(tip.part);
    if (part.type === "esc" && tip.key === "sig") return "esc" + SIM.state.install[part.id].split("@")[1];
    if (part.type === "gps") return tip.key;
    if (["pm", "rx", "telem", "buzzer", "switch"].includes(part.type) && (tip.key === "fc" || tip.key === "sig")) return part.id;
    return null;
  }
  sc.cancelPick = () => { sc.pick = null; if (liveWire) { liveWire.geometry.dispose(); drone.remove(liveWire); liveWire = null; } if (sc.onHover) sc.onHover(""); };
  function startPick(tip) {
    disconnect(tip);
    sc.pick = tip;
    SIM.select(null);
    SIM.emit();
    if (sc.onHover) sc.onHover("연결할 곳을 누르세요 · 빈 곳을 누르면 취소");
  }
  function finishPick(tg) {
    const tip = sc.pick, w = SIM.state.wiring, part = tip.part === "harness" ? { type: "harness" } : SIM.part(tip.part);
    const pos = tip.part === "harness" ? null : (SIM.state.install[tip.part] || "").split("@")[1];
    const say = (m) => SIM.toast(m, "bad");
    if (tg.kind === "escPad") {
      if (part.type !== "motor") return say("이 선은 ESC 단자에 연결하지 않습니다.");
      const escPos = SIM.state.install[tg.part].split("@")[1];
      if (escPos !== pos) return say("선이 닿지 않습니다.");
      w.motorWires[pos][tip.key[2]] = tg.pad;
    } else if (tg.kind === "pdb") {
      const red = tip.key === "pwrR" || tip.key === "outR";
      const pol = (tg.sign === "plus") === red ? "ok" : "rev";
      if (part.type === "esc" && (tip.key === "pwrR" || tip.key === "pwrK")) w.escPwr[pos] = pol;
      else if (part.type === "pm" && (tip.key === "outR" || tip.key === "outK")) w.pmOut = pol;
      else if (part.type === "battery") w.batt = "pdb";
      else return say("이 선은 PDB 패드에 연결하지 않습니다.");
    } else if (tg.kind === "pmIn") {
      if (part.type !== "battery") return say("커넥터가 맞지 않습니다.");
      w.batt = "pm";
    } else if (tg.kind === "harness") {
      if (!(part.type === "esc" && tip.key === "tel")) return say("커넥터가 맞지 않습니다.");
      w.escTelem[pos] = "harness";
    } else if (tg.kind === "fc") {
      const c = tipCable(tip);
      if (!c) return say("이 선은 FC에 꽂지 않습니다.");
      sc.cancelPick(); SIM.emit();
      if (sc.onFcCable) sc.onFcCable(c);
      return;
    }
    sc.cancelPick(); SIM.emit();
  }
  function drawLiveWire(worldPoint) {
    if (!sc.pick) return;
    if (liveWire) { liveWire.geometry.dispose(); drone.remove(liveWire); }
    const a = tipPos(sc.pick.part, sc.pick.key), b = drone.worldToLocal(worldPoint.clone()), lift = Math.max(a.y, b.y) + 0.01;
    liveWire = tube([a, new T.Vector3((a.x + b.x) / 2, lift, (a.z + b.z) / 2), b], 0xffd45e, 0.0014);
    drone.add(liveWire);
  }

  // ---------- 조작: 회전·확대, 부품 끌기, 선 연결 ----------
  function bindPointer(canvas) {
    const pts = new Map(); let moved = 0, pinch = 0, down = null;
    const ray = new T.Raycaster(), v2 = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hitP = new T.Vector3();
    const setRay = (e) => { const r = canvas.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera); };
    const partOf = (o) => { while (o && !o.userData.partId) o = o.parent; return o && o.userData.partId; };
    function pickAt(e) {
      setRay(e);
      const list = [partsRoot, drone];
      const see = sc.xray || !!sc.pick;
      for (const h of ray.intersectObjects(list, true)) {
        if (h.object === liveWire || h.object === snapRing || !h.object.visible) continue;
        if (see && h.object === sc.topPlate) continue; // 투시 중에는 상판을 지나 아래를 누른다
        if (sc.pick && h.object.material !== HIT) continue; // 연결 중에는 단자·선 끝만 찾는다
        if (h.object.material === HIT) {
          if (h.object.userData.tip) { const t = h.object.userData.tip; if (t.part === "harness" || SIM.state.install[t.part]) return { tip: t, point: h.point }; continue; }
          if (h.object.userData.target) { const tg = h.object.userData.target; if (sc.pick && (!tg.part || SIM.state.install[tg.part])) return { target: h.object.userData.target, point: h.point }; const id = partOf(h.object); if (id) return { part: id, point: h.point }; continue; }
          continue;
        }
        if (wires.children.includes(h.object) || expectGroup.children.includes(h.object)) continue;
        const id = partOf(h.object);
        if (id) return { part: id, point: h.point };
        return { frame: true, point: h.point };
      }
      return { point: ray.ray.intersectPlane(plane, hitP) ? hitP.clone() : null };
    }
    const canEdit = () => sc.env === "bench" && !sc.dragDrone && !SIM.flight.active;

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = 0;
      down = null;
      if (pts.size === 1 && canEdit() && !sc.pick) { const h = pickAt(e); if (h.part) down = { id: h.part }; }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId);
      if (!p) { // 버튼을 누르지 않은 이동: 커서 모양과 연결 미리보기
        if (!canEdit()) return;
        const h = pickAt(e);
        canvas.style.cursor = sc.pick ? (h.target ? "copy" : "crosshair") : h.tip ? "pointer" : h.part ? "grab" : "default";
        if (sc.pick) { if (h.point) drawLiveWire(h.point); if (sc.onHover) sc.onHover(h.target ? h.target.label : "연결할 곳을 누르세요 · 빈 곳을 누르면 취소"); }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) orbit.dist = clampDist(orbit.dist * (pinch / d));
        pinch = d; moved = 99; down = null; return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (down && moved > 6) { dragMove(e); return; }
      if (down) return;
      if (sc.dragDrone && sc.env === "bench") {
        const right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), dx * 0.01).multiply(new T.Quaternion().setFromAxisAngle(right, dy * 0.01));
        poseQ.premultiply(q); sc.poseName = "free"; sc.lift = 0.75;
      } else {
        orbit.theta -= dx * 0.008;
        orbit.phi = Math.min(1.52, Math.max(0.12, orbit.phi - dy * 0.008));
      }
    });
    // 부품 끌기: 가까운 장착 자리에 붙고, 없으면 작업대 위에 내려놓는다
    function dragMove(e) {
      const id = down.id, part = SIM.part(id), o = objs[id], g = o.group;
      if (!sc.drag) {
        sc.drag = { id, active: true, slot: null };
        if (SIM.state.install[id]) SIM.remove(id);
        SIM.select(null);
        if (g.parent !== partsRoot) partsRoot.attach(g);
        canvas.style.cursor = "grabbing";
      }
      setRay(e);
      const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      let best = null, bd = 64;
      for (const slot of SIM.slotsFor(part)) {
        if (SIM.canInstall(part, slot)) continue;
        const x = slotXform(slot, part), wp = drone.localToWorld(new T.Vector3(...x.p)), s = toScreen(wp), d = Math.hypot(s.x - mx, s.y - my);
        if (d < bd) { bd = d; best = { slot, x, wp }; }
      }
      sc.drag.slot = best && best.slot;
      if (best) {
        g.userData.tp = partsRoot.worldToLocal(best.wp.clone()); g.userData.tq = xfQuat(best.x);
        snapRing.visible = true; snapRing.position.copy(best.wp); snapRing.position.y += 0.01;
        if (sc.onHover) sc.onHover(SIM.slotName(best.slot));
      } else {
        snapRing.visible = false;
        plane.constant = 0;
        if (ray.ray.intersectPlane(plane, hitP)) {
          const l = partsRoot.worldToLocal(hitP.clone());
          l.x = Math.max(-0.75, Math.min(0.75, l.x)); l.z = Math.max(-0.52, Math.min(0.52, l.z)); l.y = 0.03;
          g.userData.tp = l; g.userData.tq = new T.Quaternion();
        }
        if (sc.onHover) sc.onHover("작업대에 내려놓기");
      }
    }
    function dragEnd() {
      const d = sc.drag; sc.drag = null; snapRing.visible = false;
      if (sc.onHover) sc.onHover("");
      canvas.style.cursor = "grab";
      if (d.slot) { const err = SIM.install(d.id, d.slot); if (err) SIM.toast(err, "bad"); }
      else { const t = objs[d.id].group.userData.tp; SIM.placeOnBench(d.id, +t.x.toFixed(3), +t.z.toFixed(3)); }
    }
    const up = (e) => {
      pts.delete(e.pointerId);
      if (sc.drag) { dragEnd(); down = null; return; }
      down = null;
      if (moved > 6 || e.type !== "pointerup" || !canEdit()) return;
      const h = pickAt(e);
      if (sc.pick) {
        if (h.target) finishPick(h.target);
        else if (h.tip) { sc.cancelPick(); startPick(h.tip); }
        else { sc.cancelPick(); SIM.emit(); }
        return;
      }
      if (h.tip) return startPick(h.tip);
      if (sc.onPick) sc.onPick(h.part || null);
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); orbit.dist = clampDist(orbit.dist * Math.exp(e.deltaY * 0.001)); }, { passive: false });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape" && sc.pick) { sc.cancelPick(); SIM.emit(); } });
  }
  const clampDist = (d) => Math.min(sc.env === "field" ? 60 : 7, Math.max(0.35, d));
  sc.zoom = (f) => { orbit.dist = clampDist(orbit.dist * f); };
  sc.view = (name) => {
    const v = { top: [0, 0.12], front: [Math.PI, 1.3], back: [0, 1.15], side: [Math.PI / 2, 1.3] }[name];
    orbit.theta = v[0]; orbit.phi = v[1];
  };
  // 선택한 부품 쪽으로 시점 이동
  sc.focus = (id) => { const g = objs[id] && objs[id].group; if (!g) return; const c = new T.Box3().setFromObject(g).getCenter(new T.Vector3()); orbit.target.copy(c); orbit.dist = Math.min(orbit.dist, 1.2); };
  sc.home = () => { orbit.target.set(0, 0.22, 0); orbit.dist = 2.2; };

  const tmpQ = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
  let airT = 0;
  sc.update = function (dt) {
    const k = 1 - Math.exp(-12 * dt);
    for (const part of SIM.PARTS) {
      const g = objs[part.id].group;
      if (g.userData.tp) { g.position.lerp(g.userData.tp, k); g.quaternion.slerp(g.userData.tq, k); }
    }
    if (!SIM.flight.active) {
      if (sc.tumble > 0) {
        sc.tumble -= dt;
        const t = sc.tumble;
        tmpQ.setFromAxisAngle(new T.Vector3(Math.sin(t * 0.9), Math.cos(t * 1.3), Math.sin(t * 0.5 + 1)).normalize(), dt * 2.6);
        poseQ.premultiply(tmpQ); sc.poseName = "free"; sc.lift = 0.75;
      }
      drone.quaternion.slerp(poseQ, k);
      drone.position.lerp(new T.Vector3(0, REST_Y + sc.lift, 0), k);
    }
    // 모터·프로펠러 회전 표시 (방향이 보이도록 눈에 보이는 속도는 제한)
    for (const id of SIM.POS_IDS) {
      const u = SIM.motorU[id], ph = SIM.motorPhysical(id), s = ph.dir === "ccw" ? 1 : -1;
      const m = SIM.partAt("motor@" + id), pr = SIM.partAt("prop@" + id);
      const rate = u > 0.01 ? s * (3 + 22 * u) * dt : 0;
      if (m) objs[m.id].spinner.rotateOnAxis(yAxis, ph.jitter && (SIM.motorCmd[id] || 0) > 0.02 ? (Math.random() - 0.5) * 0.25 : rate);
      if (pr) { objs[pr.id].spinner.rotateOnAxis(yAxis, rate); objs[pr.id].disc.material.opacity = Math.min(0.3, u * 0.6); }
      if (pr) objs[pr.id].group.visible = !(SIM.flight.active && SIM.flight.lost[id]);
      const A = air[id], flow = pr && u > 0.03 ? ph.thrust : 0; // 추력 방향과 반대로 공기가 흐른다
      A.m.opacity = flow ? Math.min(0.55, 0.2 + u) * Math.min(1, Math.abs(flow) + 0.3) : 0;
      if (flow) { airT += dt * (0.6 + 2 * u) * 0.25; A.g.children.forEach((c) => { const t = (c.userData.ph + airT) % 1; c.position.y = flow > 0 ? -0.01 - t * 0.14 : 0.02 + t * 0.14; }); }
    }
    for (const p of SIM.PARTS) if (!SIM.state.install[p.id] && objs[p.id].disc) objs[p.id].disc.material.opacity = 0;
    if (selBox.visible && SIM.selected) selBox.setFromObject(objs[SIM.selected].group);
    const tm = sc.topPlate.material, want = sc.env === "bench" && (sc.xray || sc.pick) ? 0.22 : 1;
    tm.opacity += (want - tm.opacity) * k; tm.depthWrite = tm.opacity > 0.9;

    if (sc.env === "field") orbit.target.lerp(drone.position, 1 - Math.exp(-6 * dt));
    const sp = Math.sin(orbit.phi);
    camera.position.set(orbit.target.x + orbit.dist * sp * Math.sin(orbit.theta), Math.max(0.05, orbit.target.y + orbit.dist * Math.cos(orbit.phi)), orbit.target.z + orbit.dist * sp * Math.cos(orbit.theta));
    camera.lookAt(orbit.target);
    sun.position.set(orbit.target.x + 1.8, orbit.target.y + 5.5, orbit.target.z + 2.4);
    sun.target.position.copy(orbit.target);
    renderer.render(scene, camera);
  };
})();
