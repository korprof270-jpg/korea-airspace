// 드론 정비 시뮬레이터 — 3D 작업대: 부품 끌어다 붙이기, 선 끝을 눌러 연결하기, 카메라
(function () {
  const SIM = window.SIM, T = THREE;
  const sc = (SIM.scene = { xray: false, env: "bench", showExpect: false, dragDrone: false, poseName: "level", lift: 0, tumble: 0, pick: null, drag: null });
  const objs = (sc.objs = {});
  const K = (sc.K = 2.2); // 2종(7~25kg)급 기체 크기
  const ARM_R = 0.225, S2 = Math.SQRT1_2, REST_Y = 0.096 * K;
  // 부품별 모형 배율 (프레임 대비 잘 보이도록 키움)
  const PS = { bottom: 1, top: 1, arm: 1, skid: 1, motor: 2.0, prop: 1.2, esc: 1.55, fc: 1.75, pm: 1.7, battery: 1.3, gps: 1.6, rx: 1.95, telem: 1.85, buzzer: 2.4, switch: 2.4 };
  let stand, renderer, scene, camera, drone, benchGroup, fieldGroup, partsRoot, wires, expectGroup, selBox, sun, snapRing, liveWire, stageEl;
  const air = {}, targets = [];
  const orbit = (sc.orbit = { theta: 0.3, phi: 0.86, dist: 2.75, target: new T.Vector3(0, 0.2, 0.16) });
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
    const h = new T.Mesh(new T.SphereGeometry(0.009, 8, 6), HIT); h.position.set(...to); h.userData.tip = { part: o.id, key }; g.add(h);
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
  // 부품 윗면에 인쇄하는 이름표 (평면)
  function nameplate(text, w, h, bg, fg) {
    const W = 256, H = Math.max(32, Math.round((256 * h) / w));
    const tex = canvasTex(W, H, (g) => {
      if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
      g.fillStyle = fg || "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      let fs = Math.round(H * 0.62); g.font = "bold " + fs + "px sans-serif";
      while (g.measureText(text).width > W * 0.9 && fs > 8) { fs -= 2; g.font = "bold " + fs + "px sans-serif"; }
      g.fillText(text, W / 2, H / 2 + 2);
    });
    const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: !bg, depthWrite: !!bg }));
    p.rotation.x = -Math.PI / 2; return p;
  }
  // 매끄러운 곡선 프로펠러 날개: 평면형(뿌리 좁고 가운데 넓고 끝이 둥근) + 비틀림
  const BLADE_R = 0.115;
  function bladeGeo(s) {
    const sh = new T.Shape();
    sh.moveTo(0.008, -0.006);
    sh.bezierCurveTo(0.03, -0.012, 0.06, -0.012, 0.1, -0.008);
    sh.quadraticCurveTo(BLADE_R + 0.002, -0.006, BLADE_R, 0.0);
    sh.quadraticCurveTo(BLADE_R - 0.002, 0.007, 0.098, 0.009);
    sh.bezierCurveTo(0.07, 0.016, 0.035, 0.02, 0.008, 0.007);
    sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0008, bevelSegments: 2, curveSegments: 24 });
    geo.translate(0, 0, -0.0006); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const th = s * (0.5 - 0.32 * Math.min(1, Math.max(0, v.x / BLADE_R)));
      const y = v.y * Math.cos(th) - v.z * Math.sin(th), z = v.y * Math.sin(th) + v.z * Math.cos(th);
      pos.setXYZ(i, v.x, y + 0.004, z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const bladeTwist = (s, r) => s * (0.5 - 0.32 * (r / BLADE_R));

  // FC 윗면 포트 위치 (FC 모형 좌표, 앞쪽 = -z). 서보 레일은 뒤쪽 한 줄: RC IN, SBUS OUT, MAIN 1–8, AUX 1–6
  const FC_PORT = {
    CAN: [-0.019, 0.016, -0.03], I2C: [-0.019, 0.016, -0.018], SPI: [-0.019, 0.016, -0.006], "SPKT/DSM": [-0.019, 0.016, 0.006], BUZZER: [-0.019, 0.016, 0.018],
    TELEM1: [0.019, 0.016, -0.03], TELEM2: [0.019, 0.016, -0.018], SWITCH: [0.019, 0.016, -0.006], "ADC 3.3V": [0.019, 0.016, 0.006], "ADC 6.6V": [0.019, 0.016, 0.018],
    POWER: [-0.01, 0.016, -0.038], "SERIAL 4/5": [0, 0.016, -0.038], GPS: [0.01, 0.016, -0.038], USB: [-0.026, 0.007, 0],
  };
  const RAIL = ["RC IN", "SBUS OUT"]; for (let n = 1; n <= 8; n++) RAIL.push("MAIN OUT " + n); for (let n = 1; n <= 6; n++) RAIL.push("AUX OUT " + n);
  RAIL.forEach((p, i) => (FC_PORT[p] = [(i - 7.5) * 0.0034, 0.012, 0.044]));
  const RX_COLS = ["1", "2", "3", "4", "5", "6", "7", "8", "SB"], rxColX = (i) => (i - 4) * 0.0026;
  const SHORT = (p) => (p === "RC IN" ? "RC" : p === "SBUS OUT" ? "SB" : /OUT/.test(p) ? p.replace(/\D/g, "") : p);

  // ---------- 부품 모형 (원점 = 장착면 중앙, 안쪽/뒤쪽 = -z) ----------
  function makePart(part) {
    const g = new T.Group(), o = { group: g, id: part.id, tips: {}, pads: {} };
    g.userData.partId = part.id;
    objs[part.id] = o;
    if (part.type === "motor") {
      g.add(cyl(0.0135, 0.008, M.dark, 0, 0.004, 0));
      const bell = new T.Group();
      bell.add(cyl(0.014, 0.016, M.steel, 0, 0.017, 0), cyl(0.0142, 0.003, M.dark, 0, 0.0215, 0));
      bell.add(cyl(0.0025, 0.012, M.steel, 0, 0.03, 0, 10));
      // 축 나사 방향에 따라 너트 색이 다르다 (검정 / 은색)
      bell.add(cyl(0.0055, 0.004, part.thread === "cw" ? M.dark : M.steel, 0, 0.0345, 0, 6));
      // X자 장착 플랜지 (나사 구멍 4개)
      for (const a of [Math.PI / 4, -Math.PI / 4]) { const f = box(0.04, 0.0025, 0.007, M.dark, 0, 0.00125, 0); f.rotation.y = a; g.add(f); }
      ["y", "b", "g"].forEach((c, k) => lead(o, "ph" + (k + 1), [(k - 1) * 0.004, 0.004, -0.012], [(k - 1) * 0.006, 0.003, -0.021], LEAD[c], 0.0011));
      g.add(bell); o.spinner = bell;
    } else if (part.type === "prop") {
      const sp = new T.Group(), s = part.dir === "ccw" ? 1 : -1, geo = bladeGeo(s);
      const b1 = new T.Mesh(geo, M.prop), b2 = new T.Mesh(geo, M.prop); b1.castShadow = b2.castShadow = true; b2.rotation.y = Math.PI;
      sp.add(b1, b2, cyl(0.0095, 0.009, M.dark, 0, 0.0045, 0, 28), cyl(0.0035, 0.0012, M.steel, 0, 0.0094, 0, 20), box(0.018, 0.002, 0.006, M.steel, 0, 0.0095, 0)); // 프로펠러 브라켓
      // 날개 윗면 인쇄: 규격(길이 2자리 + 피치 2자리)과 회전 방향 — 확대해야 읽힌다
      const txt = "2408 " + part.dir.toUpperCase();
      for (const rot of [0, Math.PI]) {
        const r = 0.066, th = bladeTwist(s, r), lb = nameplate(txt, 0.034, 0.006, null, "#e8ecec");
        const holder = new T.Group(); holder.rotation.y = rot; sp.add(holder);
        lb.rotation.x = -Math.PI / 2 + th; lb.position.set(r, 0.004 + 0.0013 * Math.cos(th), 0.0013 * Math.sin(th) + 0.001);
        holder.add(lb);
      }
      const disc = new T.Mesh(new T.CircleGeometry(0.12, 40), new T.MeshBasicMaterial({ color: 0x9aa6a8, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004;
      g.add(sp, disc); o.spinner = sp; o.disc = disc;
    } else if (part.type === "esc") {
      g.add(box(0.024, 0.008, 0.048, M.blue, 0, 0.004, 0));
      const el = nameplate("ESC", 0.018, 0.009, "#e2b322", "#1a1a1a"); el.position.set(0, 0.0083, -0.006); g.add(el);
      ["A", "B", "C"].forEach((p, k) => { const pd = box(0.005, 0.0016, 0.006, M.copper, (k - 1) * 0.007, 0.0088, 0.019); g.add(pd); o.pads[p] = new T.Vector3((k - 1) * 0.007, 0.0096, 0.019); target(g, mesh(new T.BoxGeometry(0.0068, 0.006, 0.009), HIT, (k - 1) * 0.007, 0.0096, 0.019), { kind: "escPad", part: part.id, pad: p, label: "ESC 단자 " + p }); });
      lead(o, "pwr", [-0.006, 0.004, -0.024], [-0.01, 0.004, -0.034], LEAD.r, 0.0018);
      { const k2 = new T.CatmullRomCurve3([new T.Vector3(-0.003, 0.004, -0.024), new T.Vector3(-0.006, 0.006, -0.029), new T.Vector3(-0.008, 0.004, -0.034)]); const t2 = new T.Mesh(new T.TubeGeometry(k2, 8, 0.0018, 5), LEAD.k); g.add(t2); }
      g.add(box(0.008, 0.0055, 0.0075, M.yellow, -0.009, 0.004, -0.0375)); // XT60M
      lead(o, "sig", [0.0035, 0.005, -0.024], [0.0045, 0.004, -0.034], LEAD.w, 0.0009, true);
      lead(o, "tel", [0.008, 0.005, -0.024], [0.01, 0.004, -0.032], LEAD.o, 0.0008, true);
    } else if (part.type === "fc") {
      g.add(box(0.05, 0.015, 0.082, M.dark, 0, 0.0075, 0));
      target(g, mesh(new T.BoxGeometry(0.03, 0.017, 0.06), HIT, 0, 0.0075, 0.002), { kind: "fc", part: part.id, label: "비행 컨트롤러" });
      const d = arrowDecal(0.024, 0.032, "FC", "#1b1e22"); d.position.set(0, 0.0152, 0.006); g.add(d);
      // 포트마다 커넥터 하우징과 이름 인쇄, 하나씩 꽂을 수 있는 자리
      for (const p in FC_PORT) {
        if (RAIL.includes(p)) continue;
        const v = FC_PORT[p], t = SIM.portType(p), side = Math.abs(v[0]) > 0.015 && p !== "USB";
        const len = t === "usb" ? 0.007 : (SIM.CONN_PINS[t] || 3) * 0.0012 + 0.002;
        g.add(box(side ? 0.0035 : len, 0.0025, side ? len : 0.0035, M.plug, v[0], 0.0158, v[2]));
        target(g, mesh(new T.BoxGeometry(side ? 0.006 : len + 0.002, 0.006, side ? len + 0.002 : 0.006), HIT, v[0], 0.016, v[2]), { kind: "fcPort", part: part.id, port: p, label: p });
        if (p === "USB") continue;
        const lb = nameplate(p, 0.013, 0.0028, null, "#cfd6d4");
        lb.position.set(side ? v[0] - Math.sign(v[0]) * 0.0095 : v[0], 0.0153, side ? v[2] : v[2] + 0.0045); if (side) lb.rotation.z = 0; g.add(lb);
      }
      for (const p of RAIL) {
        const v = FC_PORT[p];
        g.add(box(0.0028, 0.007, 0.004, M.plug, v[0], 0.0095, v[2]));
        target(g, mesh(new T.BoxGeometry(0.0034, 0.011, 0.008), HIT, v[0], 0.011, v[2]), { kind: "fcPort", part: part.id, port: p, label: p });
        const lb = nameplate(SHORT(p), 0.0032, 0.0026, null, "#cfd6d4"); lb.position.set(v[0], 0.0153, 0.0385); g.add(lb);
      }
    } else if (part.type === "pm") {
      g.add(box(0.022, 0.009, 0.05, M.dark, 0, 0.0045, 0));
      const nl = nameplate("PMU", 0.018, 0.009, "#2a2e33", "#ffffff"); nl.position.set(0, 0.0093, -0.004); g.add(nl);
      g.add(box(0.016, 0.009, 0.012, M.yellow, 0, 0.0045, 0.03));
      target(g, mesh(new T.BoxGeometry(0.02, 0.014, 0.016), HIT, 0, 0.0045, 0.03), { kind: "pmIn", part: part.id, label: "PMU 입력 커넥터" });
      o.pads.in = new T.Vector3(0, 0.0045, 0.037);
      lead(o, "fc", [-0.006, 0.006, -0.025], [-0.008, 0.005, -0.04], LEAD.r, 0.0009, true);
      lead(o, "outR", [0.003, 0.005, -0.025], [0.004, 0.004, -0.04], LEAD.r, 0.0019);
      lead(o, "outK", [0.008, 0.005, -0.025], [0.009, 0.004, -0.04], LEAD.k, 0.0019);
    } else if (part.type === "battery") {
      g.add(box(0.046, 0.034, 0.135, M.blue, 0, 0.017, 0), box(0.0465, 0.012, 0.136, M.dark, 0, 0.017, 0));
      const nl = nameplate("배터리", 0.04, 0.016, null, "#ffffff"); nl.position.set(0, 0.0345, -0.02); g.add(nl);
      lead(o, "xt", [0.012, 0.026, 0.068], [0.012, 0.042, 0.084], LEAD.r, 0.0024, true);
    } else if (part.type === "gps") {
      g.add(cyl(0.003, 0.07, M.carbon, 0, 0.035, 0, 8), cyl(0.012, 0.003, M.carbon, 0, 0.0015, 0), cyl(0.03, 0.012, M.dark, 0, 0.076, 0, 32));
      const d = arrowDecal(0.03, 0.045, "GPS", "#1b1e22"); d.position.y = 0.0822; g.add(d);
      lead(o, "gps", [0.003, 0.004, -0.004], [0.013, 0.003, -0.036], LEAD.l, 0.0013, true);
      lead(o, "compass", [-0.003, 0.004, -0.004], [-0.013, 0.003, -0.036], LEAD.v, 0.0011, true);
    } else if (part.type === "rx") {
      g.add(box(0.024, 0.01, 0.04, mat(0x3a3f45), 0, 0.005, 0), box(0.02, 0.0006, 0.012, M.white, 0, 0.0104, 0));
      const a1 = cyl(0.0008, 0.07, M.dark, -0.006, 0.03, 0.022, 6); a1.rotation.x = 0.5;
      const a2 = cyl(0.0008, 0.07, M.dark, 0.006, 0.03, 0.022, 6); a2.rotation.x = 0.5; a2.rotation.z = -0.5;
      g.add(a1, a2);
      const nl = nameplate("R8 수신기", 0.022, 0.007, null, "#ffffff"); nl.position.set(0, 0.0102, 0.004); g.add(nl);
      // 핀 헤더: 채널 1–8, SBUS (뒤쪽 끝)
      RX_COLS.forEach((c, i) => { const x = rxColX(i); g.add(box(0.0022, 0.004, 0.003, M.dark, x, 0.012, -0.0175)); const lb = nameplate(c === "SB" ? "B" : c, 0.0024, 0.0024, null, "#ffffff"); lb.position.set(x, 0.0104, -0.0135); g.add(lb); });
      // 바인딩 버튼과 상태 LED
      const bb = cyl(0.0022, 0.0018, M.white, 0.0095, 0.0108, -0.006, 12); g.add(bb);
      const bh = mesh(new T.BoxGeometry(0.008, 0.006, 0.008), HIT, 0.0095, 0.011, -0.006); bh.userData.bind = part.id; g.add(bh);
      const bl = nameplate("BIND", 0.007, 0.0022, null, "#ffffff"); bl.position.set(0.0095, 0.0104, -0.0015); g.add(bl);
      o.led = new T.Mesh(new T.SphereGeometry(0.0016, 10, 8), new T.MeshBasicMaterial({ color: 0x333333 })); o.led.position.set(-0.0095, 0.0108, -0.006); g.add(o.led);
      // 3선 커넥터의 FC 쪽 끝
      const hh = new T.Mesh(new T.SphereGeometry(0.0065, 8, 6), HIT); hh.position.set(0, 0.004, -0.04); hh.userData.tip = { part: part.id, key: "sig" }; g.add(hh);
      o.tips.sig = new T.Vector3(0, 0.004, -0.04);
    } else if (part.type === "buzzer") {
      g.add(cyl(0.008, 0.007, M.dark, 0, 0.0035, 0), cyl(0.002, 0.0005, M.steel, 0, 0.0072, 0, 8));
      const nl = nameplate("부저", 0.012, 0.005, null, "#ffffff"); nl.position.set(0, 0.0071, 0.0045); g.add(nl);
      lead(o, "fc", [0, 0.003, -0.008], [0, 0.003, -0.018], LEAD.k, 0.0008, true);
    } else if (part.type === "switch") {
      g.add(box(0.014, 0.008, 0.014, M.dark, 0, 0.004, 0), cyl(0.0045, 0.004, M.red, 0, 0.01, 0, 16));
      const nl = nameplate("안전 스위치", 0.014, 0.0035, null, "#ffffff"); nl.position.set(0, 0.0081, 0.0055); g.add(nl);
      lead(o, "fc", [0, 0.003, -0.007], [0, 0.003, -0.018], LEAD.r, 0.0008, true);
    } else if (part.type === "telem") {
      g.add(box(0.024, 0.01, 0.046, M.green, 0, 0.005, 0), cyl(0.003, 0.075, M.dark, 0, 0.045, 0.02, 8));
      const nl = nameplate("텔레메트리", 0.02, 0.006, null, "#ffffff"); nl.position.set(0, 0.0102, -0.006); g.add(nl);
      lead(o, "fc", [0, 0.005, -0.023], [0, 0.004, -0.034], LEAD.y, 0.0009, true);
    }
    if (part.type === "bottom") buildBottom(o);
    addHoles(o, part);
    if (part.type === "top") buildTop(o);
    if (part.type === "arm") buildArm(o, part);
    if (part.type === "skid") buildSkid(o);
    g.scale.setScalar(PS[part.type] || 1);
    if (["motor", "esc", "pm", "gps", "rx", "telem", "buzzer", "switch", "battery"].includes(part.type)) { // 작은 부품은 넉넉한 클릭 영역
      const sc0 = g.scale.x, bb = new T.Box3().setFromObject(g), c = bb.getCenter(new T.Vector3()).divideScalar(sc0), sz = bb.getSize(new T.Vector3()).divideScalar(sc0), m = 0.006 / sc0;
      const hb = mesh(new T.BoxGeometry(sz.x + m, sz.y + m, sz.z + m), HIT, c.x, c.y, c.z); hb.userData.partHit = part.id; g.add(hb);
    }
    return g;
  }

  // ---------- 나사 구멍 (부품 좌표) ----------
  const HOLE_POS = {
    motor: [0, 1, 2, 3].map((k) => [Math.cos(Math.PI / 4 + (k * Math.PI) / 2) * 0.0175, 0.0026, Math.sin(Math.PI / 4 + (k * Math.PI) / 2) * 0.0175]),
    prop: [[0.0065, 0.0106, 0], [-0.0065, 0.0106, 0]],
    arm: [[0, 0.0122, -0.097], [0, 0.0122, -0.087]],
    bottom: [[0.095, 0.0004, 0], [-0.095, 0.0004, 0], [0, 0.0004, 0.104], [0, 0.0004, -0.104]],
    top: [[0.06, 0.0016, 0.078], [-0.06, 0.0016, 0.078], [0.06, 0.0016, -0.078], [-0.06, 0.0016, -0.078]],
    skid: [[0.045, 0.0016, 0.1], [-0.045, 0.0016, 0.1], [0.045, 0.0016, -0.1], [-0.045, 0.0016, -0.1]],
  };
  const headR = (size) => +size * 0.00075; // 기체 좌표 기준 나사 머리 반지름
  const holeHit = [];
  function makeHead(size) {
    const g = new T.Group(), r = headR(size);
    g.add(cyl(r, 0.0012, M.dark, 0, 0.0006, 0, 18), cyl(r * 0.42, 0.0004, mat(0x050505), 0, 0.0012, 0, 6));
    g.add(cyl(r * 0.55, 0.004, M.steel, 0, -0.002, 0, 10)); // 나사산 (떠 있을 때 보인다)
    return g;
  }
  function addHoles(o, part) {
    const list = HOLE_POS[part.type]; if (!list) return;
    o.holes = list.map((p, i) => {
      const hg = new T.Group(); hg.position.set(...p); hg.scale.setScalar(1 / (PS[part.type] || 1));
      (part.type === "prop" ? o.spinner : o.group).add(hg);
      const req = SIM.SCREW_REQ[part.type];
      hg.add(cyl(headR(req) * 0.6, 0.0004, mat(0x0a0a0a), 0, 0.0002, 0, 14)); // 구멍
      const hit = mesh(new T.CylinderGeometry(headR(req) * 1.6, headR(req) * 1.6, 0.004, 10), HIT, 0, 0.001, 0);
      hit.userData.hole = part.id + ":" + i; hg.add(hit); holeHit.push(hit);
      return { g: hg, head: null, key: part.id + ":" + i };
    });
  }
  function syncScrews() {
    for (const p of SIM.PARTS) {
      const o = objs[p.id]; if (!o.holes) continue;
      for (const h of o.holes) {
        const v = SIM.state.screws[h.key] || "", size = SIM.screwSize(v);
        if (h.head && h.size !== size) { h.g.remove(h.head); h.head = null; }
        if (size && !h.head) { h.head = makeHead(size); h.size = size; h.g.add(h.head); }
        if (h.head) h.head.position.y = SIM.screwTight(v) ? 0 : 0.0026; // 조이기 전에는 떠 있다
      }
    }
  }

  // PDB 패드 위치 (기체 기준 x, z)
  const PADS = { batt: { plus: [-0.014, 0.088], minus: [0.014, 0.088] } };
  for (const id of SIM.POS_IDS) { const p = SIM.POS[id], dx = p.x * S2, dz = p.z * S2; PADS[id] = { plus: [dx * 0.088 - dz * 0.027, dz * 0.088 + dx * 0.027], minus: [dx * 0.088 + dz * 0.027, dz * 0.088 - dx * 0.027] }; }
  const HARNESS = [-0.048, 0.0015, -0.03];
  const armDir = (pid) => { const p = SIM.POS[pid]; return [p.x * S2, p.z * S2]; };
  // XT60F 위치: 붐대 양옆 (i=0 → 오른쪽 옆, 1 → 왼쪽 옆)
  const xtRoot = (pid, i) => { const [dx, dz] = armDir(pid), s = i ? 1 : -1; return new T.Vector3(dx * 0.066 - dz * 0.03 * s, 0.002, dz * 0.066 + dx * 0.03 * s); };
  const xtLocal = (pid, i) => { const [dx, dz] = armDir(pid), s = i ? 1 : -1; return new T.Vector3(dx * 0.1 - dz * 0.034 * s, 0.004, dz * 0.1 + dx * 0.034 * s); };
  const octPlate = (w, d, m) => { const p = mesh(new T.CylinderGeometry(0.5, 0.5, 0.003, 8), m || M.carbon, 0, 0, 0); p.scale.set(w * 1.08, 1, d * 1.08); p.rotation.y = Math.PI / 8; return p; };
  // 하판: 카본 판 + PDB(구리 패드, +/− 인쇄) + 통신선 하네스 + 스탠드오프
  function buildBottom(o) {
    const g = o.group;
    const pl = octPlate(0.21, 0.21); pl.position.y = -0.0015; g.add(pl);
    const pcb = mesh(new T.CylinderGeometry(0.5, 0.5, 0.0006, 8), mat(0x143d2c, { roughness: 0.5 }), 0, 0.0004, 0); pcb.scale.set(0.2 * 1.08, 1, 0.2 * 1.08); pcb.rotation.y = Math.PI / 8; pcb.castShadow = false; g.add(pcb);
    const silk = (ch) => { const p = new T.Mesh(new T.PlaneGeometry(0.011, 0.011), new T.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { c.fillStyle = "#143d2c"; c.fillRect(0, 0, 64, 64); c.fillStyle = "#fff"; c.font = "bold 58px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, 32, 34); }) })); p.rotation.x = -Math.PI / 2; return p; };
    // XT60F 8개 (붐대 양옆, 짧은 빨강·검정 선 끝)
    SIM.POS_IDS.forEach((pid) => SIM.XT_OF[pid].forEach((xt, i) => {
      const c = xtLocal(pid, i), a = xtRoot(pid, i);
      for (const [col, off] of [[LEAD.r, -0.0018], [LEAD.k, 0.0018]]) { const cv = new T.CatmullRomCurve3([new T.Vector3(a.x + off, 0.0015, a.z), new T.Vector3((a.x + c.x) / 2 + off, 0.005, (a.z + c.z) / 2), new T.Vector3(c.x + off * 0.6, 0.004, c.z)]); const m = new T.Mesh(new T.TubeGeometry(cv, 8, 0.0016, 5), col); m.castShadow = true; g.add(m); }
      const hs = box(0.009, 0.006, 0.009, M.yellow, c.x, 0.004, c.z); hs.rotation.y = Math.atan2(SIM.POS[pid].x, SIM.POS[pid].z); g.add(hs);
      target(g, mesh(new T.BoxGeometry(0.015, 0.012, 0.015), HIT, c.x, 0.004, c.z), { kind: "xt", part: o.id, xt, pos: pid, label: "PDB " + SIM.xtName(xt) });
      const nl = nameplate(xt.slice(2), 0.006, 0.004, null, "#ffffff"); nl.position.set(a.x, 0.0012, a.z); g.add(nl);
    }));
    for (const key of ["batt"]) for (const sgn of ["plus", "minus"]) {
      const a = PADS[key][sgn];
      g.add(box(0.014, 0.0012, 0.014, sgn === "plus" ? M.copper : M.steel, a[0], 0.001, a[1]));
      target(g, mesh(new T.BoxGeometry(0.016, 0.008, 0.016), HIT, a[0], 0.003, a[1]), { kind: "pdb", part: o.id, group: key, sign: sgn, label: "PDB " + (sgn === "plus" ? "＋" : "－") + " 패드" });
      const s = silk(sgn === "plus" ? "+" : "−"), k = 1 + 0.016 / Math.hypot(a[0], a[1]);
      s.position.set(a[0] * k, 0.0011, a[1] * k); g.add(s);
    }
    const pn = nameplate("PDB", 0.024, 0.008, null, "#e6efe9"); pn.position.set(0.045, 0.0011, 0.05); g.add(pn);
    const hb = new T.Group(); hb.position.set(...HARNESS); g.add(hb);
    hb.add(box(0.02, 0.006, 0.012, M.plug, 0, 0.003, 0));
    target(hb, mesh(new T.BoxGeometry(0.024, 0.012, 0.016), HIT, 0, 0.003, 0), { kind: "harness", part: o.id, label: "ESC 통신선 하네스" });
    const ho = { group: hb, id: o.id, tips: {}, pads: {} };
    lead(ho, "harness", [0, 0.004, -0.006], [0.004, 0.006, -0.022], LEAD.o, 0.0009, true);
    o.tips.harness = ho.tips.harness.clone().add(new T.Vector3(...HARNESS));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.003, 0.038, M.steel, sx * 0.06, 0.018, sz * 0.078, 8));
  }
  function buildTop(o) {
    const pl = octPlate(0.21, 0.24, M.carbon.clone()); pl.material.transparent = true; o.group.add(pl); sc.topPlate = pl;
    o.group.add(cyl(0.006, 0.003, M.carbon, 0, 0.003, 0.09)); // 마스트 받침
    const fr = arrowDecal(0.016, 0.022, "", "#22262a"); fr.position.set(0, 0.0016, -0.1); o.group.add(fr);
  }
  // 붐대: 가운데가 원점, 바깥쪽 = +z (끝에 모터 마운트)
  function buildArm(o, part) {
    const g = o.group;
    g.add(box(0.03, 0.016, 0.2, part.color === "red" ? M.red : M.white, 0, 0.002, 0));
    g.add(cyl(0.04, 0.004, M.carbon, 0, 0.008, ARM_R - 0.14));
    g.add(box(0.032, 0.02, 0.016, M.carbon, 0, 0.002, -0.092)); // 안쪽 클램프
  }
  // 스키드: 앞뒤로 긴 원통 레일 2개, 하판에 물리는 가로대 2개, 바깥으로 벌어진 굽은 다리 4개
  function buildSkid(o) {
    const g = o.group, r = 0.0055, RY = -0.0895, RX = 0.12;
    const tubeAlong = (pts, rr) => { const c = new T.CatmullRomCurve3(pts.map((p) => new T.Vector3(...p))); const m = new T.Mesh(new T.TubeGeometry(c, 32, rr, 10), M.carbon); m.castShadow = true; return m; };
    for (const sx of [-1, 1]) {
      g.add(tubeAlong([[sx * RX, RY, -0.17], [sx * RX, RY, 0.17]], r));
      for (const sz of [-1, 1]) { const cap = new T.Mesh(new T.SphereGeometry(r, 10, 8), M.dark); cap.position.set(sx * RX, RY, sz * 0.17); g.add(cap); }
      for (const sz of [-1, 1]) g.add(tubeAlong([[sx * 0.062, -0.006, sz * 0.1], [sx * 0.07, -0.03, sz * 0.1], [sx * 0.1, -0.07, sz * 0.1], [sx * RX, RY, sz * 0.1]], 0.0045));
      for (const sz of [-1, 1]) g.add(box(0.016, 0.01, 0.014, M.dark, sx * RX, RY + 0.004, sz * 0.1)); // 레일 이음쇠
    }
    for (const sz of [-1, 1]) {
      g.add(tubeAlong([[-0.075, -0.006, sz * 0.1], [0.075, -0.006, sz * 0.1]], 0.0045));
      for (const sx of [-1, 1]) g.add(box(0.014, 0.008, 0.016, M.dark, sx * 0.045, -0.003, sz * 0.1)); // 하판 클램프
    }
  }

  // ---------- 장착 자리 (기체 기준 위치·방향) ----------
  const DECKPOS = { "deck:C": [0, 0.04, -0.012], "deck:L": [-0.077, 0.04, -0.035], "deck:R": [0.077, 0.04, -0.035], "deck:RL": [-0.074, 0.04, 0.058], "deck:RR": [0.074, 0.04, 0.058], mast: [0, 0.043, 0.09], "bot:C": [0, 0.0015, 0.004], under: [0, -0.047, 0] };
  function slotXform(slot, part) {
    const [t, pos] = slot.split("@"), st = SIM.state;
    if (pos) {
      const p = SIM.POS[pos], ry = Math.atan2(p.x, p.z);
      if (t === "arm") return { p: [p.x * 0.14 * S2, 0, p.z * 0.14 * S2], ry };
      if (t === "motor") return { p: [p.x * ARM_R * S2, 0.01, p.z * ARM_R * S2], ry };
      if (t === "prop") { const fl = part && st.flip[part.id]; return { p: [p.x * ARM_R * S2, fl ? 0.093 : 0.085, p.z * ARM_R * S2], ry: 0, rx: fl ? Math.PI : 0 }; }
      return { p: [p.x * 0.088 * S2, 0.01, p.z * 0.088 * S2], ry };
    }
    const ry = part && (part.type === "fc" || part.type === "gps") ? (-st.rot[part.type] * Math.PI) / 2 : 0;
    if (slot === "frame:base") return { p: [0, 0, 0], ry: 0 };
    if (slot === "frame:top") return { p: [0, 0.0385, 0], ry: 0 };
    if (slot === "frame:skid") return { p: [0, -0.0015, 0], ry: 0 };
    return { p: DECKPOS[slot], ry };
  }
  // 작업대 위 기본 보관 위치 (partsRoot 좌표)
  function homeOf(part) {
    const b = SIM.state.bench[part.id], by = { skid: 0.095, bottom: 0.0015, top: 0.0015, arm: 0.006 }[part.type] || 0;
    if (b) return { p: [b[0], by, b[1]], ry: part.type === "skid" ? Math.PI / 2 : 0 };
    const n = +(part.id.match(/\d+$/) || [1])[0] - 1;
    if (part.type === "bottom") return { p: [-0.52, 0.0015, -0.39], ry: 0 };
    if (part.type === "top") return { p: [-0.24, 0.0015, -0.39], ry: 0 };
    if (part.type === "arm") return { p: [0.12 + n * 0.055, 0.006, -0.39], ry: 0 };
    if (part.type === "skid") return { p: [0.56, 0.095, -0.38], ry: Math.PI / 2 };
    if (part.type === "motor") return { p: [-0.66, 0, -0.17 + n * 0.11], ry: 0 };
    if (part.type === "esc") return { p: [-0.52, 0, -0.17 + n * 0.11], ry: 0 };
    if (part.type === "prop") return { p: [0.6, 0, -0.13 + n * 0.1], ry: 0 };
    const row = { fc: -0.42, pm: -0.3, battery: -0.17, gps: 0.0, rx: 0.12, telem: 0.22, buzzer: 0.31, switch: 0.39 };
    return { p: [row[part.type], 0, 0.41], ry: 0 };
  }
const BIND_MSG = { held: "바인드 버튼을 누르고 있습니다. 이 상태로 수신기에 전원을 넣으세요.", released: "바인드 버튼에서 손을 뗐습니다.", "": "수신기 바인드 대기 중 (LED 빠르게 깜빡임)" };
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
    const g = o.group, s = g.scale.x;
    return v.clone().multiplyScalar(s).applyQuaternion(g.userData.tq).add(g.userData.tp);
  }
  const tipPos = (id, key) => toDrone(objs[id], objs[id].tips[key]);
  const padPos = (key, sgn) => new T.Vector3(PADS[key][sgn][0], 0.002, PADS[key][sgn][1]);
  const fcPortPos = (port) => toDrone(objs.fc, new T.Vector3(...(FC_PORT[port] || [0, 0.014, 0])));
  let curMeta = null; // 지금 그리는 선이 무엇인지 (누르면 정보창)
  function link(a, b, color, r) {
    const lift = Math.max(a.y, b.y) + 0.014;
    const pts = [a, new T.Vector3(a.x + (b.x - a.x) * 0.15, lift, a.z + (b.z - a.z) * 0.15), new T.Vector3(a.x + (b.x - a.x) * 0.85, lift, a.z + (b.z - a.z) * 0.85), b];
    wires.add(tube(pts, color, (r || 0.0013) * 1.3));
    if (curMeta) { const fat = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 16, 0.0045, 5), HIT); fat.userData.wire = curMeta; wires.add(fat); }
  }
  // 케이블 이름 → 선 끝 (부품, 팁)
  sc.cableTip = (c) => {
    if (c === "escTelem") return ["frameBot", "harness"];
    if (/^esc[A-Z]{2}$/.test(c)) { const p = SIM.partAt("esc@" + c.slice(3)); return p ? [p.id, "sig"] : null; }
    return { pm: ["pm", "fc"], gps: ["gps", "gps"], compass: ["gps", "compass"], telem: ["telem", "fc"], buzzer: ["buzzer", "fc"], switch: ["switch", "fc"], rx: ["rx", "sig"] }[c];
  };
  const CABLE_COL = { pm: 0xc8281e, gps: 0x3a78d8, compass: 0x8a5ad0, telem: 0xe0c020, buzzer: 0x202020, switch: 0xc8281e, rx: 0x2f9a4a, escTelem: 0xe88a20 };
  function rebuildWires() {
    while (wires.children.length) { const c = wires.children.pop(); c.geometry.dispose(); }
    curMeta = null;
    const w = SIM.state.wiring, fcIn = SIM.has("fc"), RED = 0xc8281e, BLK = 0x161616;
    for (const id of SIM.POS_IDS) {
      const escP = SIM.partAt("esc@" + id), mot = SIM.partAt("motor@" + id);
      if (!escP) continue;
      if (mot) for (let k = 1; k <= 3; k++) { const pad = w.motorWires[id][k]; curMeta = { label: SIM.POS[id].name + " 모터선 " + "①②③"[k - 1] + " → ESC 단자 " + pad, tip: { part: mot.id, key: "ph" + k } }; if (pad) link(tipPos(mot.id, "ph" + k), toDrone(objs[escP.id], objs[escP.id].pads[pad]), [0xe0c020, 0x2c6fd0, 0x2f9a4a][k - 1], 0.0015); }
      curMeta = { label: SIM.POS[id].name + " ESC 전원선 → PDB " + (SIM.escPowered(id) ? SIM.xtName(w.escPwr[id]) : ""), tip: { part: escP.id, key: "pwr" } };
      if (SIM.escPowered(id) && SIM.has("frameBot")) { const xi = SIM.XT_OF[id].indexOf(w.escPwr[id]), b = xtLocal(id, xi); link(tipPos(escP.id, "pwr"), b, RED, 0.0024); const t0 = tipPos(escP.id, "pwr"); link(t0.clone().add(new T.Vector3(0.002, 0, 0.002)), b.clone().add(new T.Vector3(0.002, 0, 0.002)), BLK, 0.0024); }
      curMeta = { label: SIM.POS[id].name + " ESC 통신선 → 하네스", tip: { part: escP.id, key: "tel" } };
      if (w.escTelem[id] === "harness" && SIM.has("frameBot")) link(tipPos(escP.id, "tel"), toDrone(objs.frameBot, new T.Vector3(HARNESS[0], 0.007, HARNESS[2])), 0xe88a20, 0.0009);
    }
    if (SIM.has("rx")) {
      const o = objs.rx, col = (rev) => (rev ? [0xf2f2f2, 0xc8281e, 0x161616] : [0x161616, 0xc8281e, 0xf2f2f2]);
      const end = tipPos("rx", "sig"), side = toDrone(o, new T.Vector3(0.004, 0, 0)).sub(toDrone(o, new T.Vector3(0, 0, 0))).normalize();
      const tri = (a, b, cols, plugA, plugB) => {
        for (let k = 0; k < 3; k++) { const off = side.clone().multiplyScalar((k - 1) * 0.0022); link(a.clone().add(off), b.clone().add(off), cols[k], 0.0009); }
        for (const [p, on] of [[a, plugA], [b, plugB]]) if (on) { const m = new T.Mesh(new T.BoxGeometry(0.008, 0.004, 0.006), mat(0x111111)); m.position.copy(p); wires.add(m); }
      };
      const ri = RX_COLS.indexOf(w.rxEnd);
      curMeta = { label: "수신기 3선 커넥터 (수신기 쪽 " + (w.rxEnd === "SB" ? "SBUS" : "CH" + w.rxEnd) + (w.rxRevRx ? ", 반대 방향" : "") + ")", tip: { part: "rx", key: "rxEnd" } };
      if (ri >= 0) tri(toDrone(o, new T.Vector3(rxColX(ri), 0.0145, -0.0175)), end, col(w.rxRevRx), true, true);
      else { const m = new T.Mesh(new T.BoxGeometry(0.008, 0.004, 0.006), mat(0x111111)); m.position.copy(end); wires.add(m); }
      curMeta = { label: "수신기 3선 커넥터 → FC " + w.plug.rx + (w.rxRevFc ? " (반대 방향)" : ""), tip: { part: "rx", key: "sig" } };
      if (fcIn && w.plug.rx && SIM.cableReady("rx")) tri(end, fcPortPos(w.plug.rx), col(w.rxRevFc), false, true);
    }
    if (fcIn) for (const c in w.plug) {
      if (c === "rx") continue;
      if (!w.plug[c] || !SIM.cableReady(c)) continue;
      const t = sc.cableTip(c); if (!t) continue;
      curMeta = { label: (SIM.CABLES[c].name) + " → FC " + w.plug[c], tip: { part: t[0], key: t[1] } };
      link(tipPos(t[0], t[1]), fcPortPos(w.plug[c]), /^esc[A-Z]/.test(c) ? 0xf2f2f2 : CABLE_COL[c], 0.0013);
    }
    curMeta = { label: "PMU 출력선 → PDB 주전원 패드", tip: { part: "pm", key: "outR" } };
    if (SIM.has("pm") && w.pmOut) { const rv = w.pmOut === "rev"; link(tipPos("pm", "outR"), padPos("batt", rv ? "minus" : "plus"), RED, 0.0021); link(tipPos("pm", "outK"), padPos("batt", rv ? "plus" : "minus"), BLK, 0.0021); }
    curMeta = { label: "배터리 커넥터 → " + (w.batt === "pm" ? "PMU 입력" : "PDB 패드"), tip: { part: "battery", key: "xt" } };
    if (SIM.has("battery") && w.batt === "pm" && SIM.has("pm")) link(tipPos("battery", "xt"), toDrone(objs.pm, objs.pm.pads.in), RED, 0.003);
    if (SIM.has("battery") && w.batt === "pdb") { link(tipPos("battery", "xt"), padPos("batt", "plus"), RED, 0.0026); link(tipPos("battery", "xt"), padPos("batt", "minus"), BLK, 0.0026); }
  }

  function rebuildExpect() {
    curMeta = null;
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
    rebuildWires(); rebuildExpect(); syncScrews();
    if (stand) stand.visible = sc.env === "bench" && !SIM.has("skid");
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
    if (env === "bench") { orbit.target.set(0, 0.2, 0.16); orbit.dist = 2.75; orbit.theta = 0.3; orbit.phi = 0.86; sc.setPose("level"); drone.position.set(0, REST_Y, 0); drone.quaternion.identity(); }
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
    // 스키드가 없을 때 기체를 받쳐 두는 조립 거치대
    stand = new T.Group();
    for (const sx of [-1, 1]) { stand.add(cyl(0.012, REST_Y - 0.004, M.steel, sx * 0.09 * K, (REST_Y - 0.004) / 2, 0, 16)); stand.add(cyl(0.05, 0.012, M.dark, sx * 0.09 * K, 0.006, 0, 24)); }
    benchGroup.add(stand);
    wires = new T.Group(); expectGroup = new T.Group();
    drone.add(wires, expectGroup);
    partsRoot = new T.Group(); partsRoot.scale.setScalar(K);
    scene.add(drone, partsRoot);
    for (const part of SIM.PARTS) { const g = makePart(part), h = homeOf(part); g.position.set(h.p[0], h.p[1], h.p[2]); partsRoot.add(g); }
    buildTools(); buildTx();
    // 프로펠러 바람(공기 흐름) 표시
    for (const id of SIM.POS_IDS) {
      const g = new T.Group(); g.position.set(SIM.POS[id].x * ARM_R * S2, 0.088, SIM.POS[id].z * ARM_R * S2); drone.add(g);
      const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 0.03 + (i % 6) * 0.02; const st = new T.Mesh(new T.BoxGeometry(0.003, 0.03, 0.003), m); st.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); st.userData.ph = i / 12; g.add(st); }
      air[id] = { g, m };
      for (const d of ["cw", "ccw"]) { const ar = spinArrow(d); ar.scale.setScalar(3.2); ar.position.set(SIM.POS[id].x * ARM_R * S2, 0.13, SIM.POS[id].z * ARM_R * S2); ar.visible = false; ar.renderOrder = 15; ar.material.depthTest = false; drone.add(ar); air[id][d] = ar; }
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
    const resize = () => { const w = canvas.clientWidth || 300, h = canvas.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    try { const ro = new ResizeObserver(resize); ro.observe(stageEl); ro.observe(canvas); } catch (e) {} window.addEventListener("resize", resize);
    resize();
    sc.sync();
    SIM.on(sc.sync);
  };

  // ---------- 나사 케이스와 육각렌치 (작업대 오른쪽 앞) ----------
  const toolObjs = {};
  function buildTools() {
    const cs = new T.Group(); cs.position.set(0.0, 0, -0.4); cs.userData.tool = true; partsRoot.add(cs);
    cs.add(box(0.21, 0.004, 0.1, mat(0x2b3a46), 0, 0.002, 0));
    const wall = mat(0x3d5262);
    for (const x of [-0.105, -0.035, 0.035, 0.105]) cs.add(box(0.003, 0.016, 0.1, wall, x, 0.008, 0));
    for (const z of [-0.05, 0.05]) cs.add(box(0.21, 0.016, 0.003, wall, 0, 0.008, z));
    SIM.SCREW_SIZES.forEach((size, i) => {
      const cx = -0.07 + i * 0.07, r = headR(size);
      for (let k = 0; k < 9; k++) { // 칸 안에 흩어진 나사
        const sc2 = new T.Group(); sc2.add(cyl(r, 0.0012, M.dark, 0, 0, 0, 14), cyl(r * 0.55, 0.006, M.steel, 0, 0, 0.0035, 10).rotateX(Math.PI / 2));
        sc2.position.set(cx + ((k % 3) - 1) * 0.016, 0.006, -0.02 + Math.floor(k / 3) * 0.018); sc2.rotation.y = k * 1.3; cs.add(sc2);
      }
      const lb = nameplate("M" + size, 0.036, 0.012, "#e8eef2", "#1b2630"); lb.position.set(cx, 0.0045, 0.038); cs.add(lb);
      const hit = mesh(new T.BoxGeometry(0.068, 0.03, 0.098), HIT, cx, 0.012, 0); hit.userData.bin = size; cs.add(hit);
      toolObjs["bin" + size] = cs;
    });
    // 육각렌치 3개 (L자, 굵기가 크기마다 다르다)
    SIM.SCREW_SIZES.forEach((size, i) => {
      const kg = new T.Group(), t = +size * 0.0011, z = -0.325 + i * 0.042; kg.userData.tool = true;
      kg.position.set(-0.07, t / 2, z);
      const steel = mat(0x8d969c, { metalness: 0.7, roughness: 0.35 });
      const long = new T.Mesh(new T.CylinderGeometry(t, t, 0.11, 6), steel); long.rotation.z = Math.PI / 2; long.position.x = 0.055; long.castShadow = true;
      const short = new T.Mesh(new T.CylinderGeometry(t, t, 0.03, 6), steel); short.rotation.x = Math.PI / 2; short.position.set(0, 0, -0.015); short.castShadow = true;
      kg.add(long, short); kg.userData.mat = steel;
      const lb = nameplate(size, 0.014, 0.008, "#f2d23c", "#1a1a1a"); lb.position.set(0.122, t + 0.0005, 0); kg.add(lb);
      const hit = mesh(new T.BoxGeometry(0.15, 0.02, 0.024), HIT, 0.05, 0.004, -0.004); hit.userData.key = size; kg.add(hit);
      partsRoot.add(kg); toolObjs["key" + size] = kg;
    });
  }
  // ---------- 조종기 (TX12 형태) ----------
  function buildTx() {
    const g = new T.Group(); g.position.set(-0.4, 0, 0.24); g.rotation.y = 0.25; g.userData.tool = true; partsRoot.add(g);
    const body = mat(0x2a2d31, { roughness: 0.55 }), dark = mat(0x16181a);
    g.add(box(0.17, 0.03, 0.085, body, 0, 0.022, 0)); // 몸체
    for (const sx of [-1, 1]) { const grip = box(0.04, 0.034, 0.05, body, sx * 0.07, 0.017, 0.045); grip.rotation.x = 0.25; g.add(grip); }
    const handle = new T.Mesh(new T.TorusGeometry(0.03, 0.006, 8, 20, Math.PI), dark); handle.position.set(0, 0.038, -0.05); g.add(handle);
    g.add(box(0.06, 0.002, 0.034, mat(0x8fa39a, { roughness: 0.3 }), 0, 0.0375, -0.012)); // LCD
    const lb = nameplate("TX12", 0.022, 0.007, null, "#e8ecec"); lb.position.set(0, 0.0376, 0.016); g.add(lb);
    for (const sx of [-1, 1]) { // 짐벌과 스틱
      g.add(cyl(0.019, 0.003, dark, sx * 0.058, 0.0385, 0.012, 24));
      const st = cyl(0.0028, 0.03, M.steel, sx * 0.058, 0.053, 0.012, 10); g.add(st); g.add(cyl(0.006, 0.006, dark, sx * 0.058, 0.068, 0.012, 12));
      for (const k of [0, 1]) g.add(cyl(0.0022, 0.012, M.steel, sx * (0.04 + k * 0.03), 0.043, -0.04, 8)); // 스위치
    }
    const ant = cyl(0.004, 0.06, dark, 0.07, 0.06, -0.04, 10); ant.rotation.z = -0.3; g.add(ant);
    const hit = mesh(new T.BoxGeometry(0.19, 0.08, 0.13), HIT, 0, 0.035, 0.005); hit.userData.txBox = true; g.add(hit);
    toolObjs.tx = g;
  }

  // 손에 든 것: 나사 한 개(크기) 또는 육각렌치(크기)
  sc.held = null;
  function setHeld(h) {
    sc.held = h;
    for (const size of SIM.SCREW_SIZES) { const k = toolObjs["key" + size]; k.userData.mat.emissive.setHex(h && h.kind === "key" && h.size === size ? 0xb07a00 : 0x000000); }
    if (sc.onHover) sc.onHover("");
  }
  const heldLabel = () => (sc.held ? (sc.held.kind === "key" ? sc.held.size + " 육각렌치" : "M" + sc.held.size + " 나사") : "");

  // ---------- 화면 좌표 ----------
  const _v = new T.Vector3();
  function toScreen(world) {
    _v.copy(world).project(camera);
    const cv = renderer.domElement; return { x: ((_v.x + 1) / 2) * cv.clientWidth, y: ((1 - _v.y) / 2) * cv.clientHeight, vis: _v.z < 1 };
  }
  sc.screenOf = (id) => { const g = objs[id].group, b = new T.Box3().setFromObject(g), c = b.getCenter(new T.Vector3()); c.y = b.max.y; return toScreen(c); };

  // ---------- 선 연결 ----------
  // 지금 이 선 끝이 연결된 상태를 끊는다
  function disconnect(tip) {
    const w = SIM.state.wiring, id = tip.part, k = tip.key, slot = SIM.state.install[id] || "", pos = slot.split("@")[1];
    if (k === "harness") w.plug.escTelem = "";
    else if (k === "rxEnd") w.rxEnd = "";
    else if (/^ph\d$/.test(k)) w.motorWires[pos][k[2]] = "";
    else if (k === "pwr") w.escPwr[pos] = "";
    else if (k === "tel") w.escTelem[pos] = "";
    else if (k === "outR" || k === "outK") w.pmOut = "";
    else if (k === "xt") w.batt = "";
    else { const c = tipCable(tip); if (c) w.plug[c] = ""; }
  }
  function tipCable(tip) {
    if (tip.key === "harness") return "escTelem";
    const part = SIM.part(tip.part);
    if (part.type === "esc" && tip.key === "sig") return "esc" + SIM.state.install[part.id].split("@")[1];
    if (part.type === "gps") return tip.key;
    if (["pm", "rx", "telem", "buzzer", "switch"].includes(part.type) && (tip.key === "fc" || tip.key === "sig")) return part.id;
    return null;
  }
  sc.disconnectTip = (tip) => { disconnect(tip); SIM.emit(); };
  sc.cancelPick = () => { sc.pick = null; sc.wireDrag = false; if (liveWire) { liveWire.geometry.dispose(); drone.remove(liveWire); liveWire = null; } if (sc.onHover) sc.onHover(""); };
  function startPick(tip) {
    disconnect(tip);
    sc.pick = tip;
    SIM.select(null);
    SIM.emit();
  }
  function finishPick(tg) {
    const tip = sc.pick, w = SIM.state.wiring, part = SIM.part(tip.part);
    const pos = (SIM.state.install[tip.part] || "").split("@")[1];
    const say = (m) => SIM.toast(m, "bad");
    if (tg.kind === "escPad") {
      if (part.type !== "motor") return say("이 선은 ESC 단자에 연결하지 않습니다.");
      const escPos = SIM.state.install[tg.part].split("@")[1];
      if (escPos !== pos) return say("선이 닿지 않습니다.");
      w.motorWires[pos][tip.key[2]] = tg.pad;
    } else if (tg.kind === "pdb") {
      const red = tip.key === "pwrR" || tip.key === "outR";
      const pol = (tg.sign === "plus") === red ? "ok" : "rev";
      if (part.type === "pm" && (tip.key === "outR" || tip.key === "outK")) w.pmOut = pol;
      else if (part.type === "battery") w.batt = "pdb";
      else return say("이 선은 PDB 패드에 연결하지 않습니다.");
    } else if (tg.kind === "xt") {
      if (!(part.type === "esc" && tip.key === "pwr")) return say("커넥터가 맞지 않습니다.");
      if (tg.pos !== pos) return say("선이 닿지 않습니다.");
      SIM.setEscXt(pos, tg.xt); sc.cancelPick(); return;
    } else if (tg.kind === "pmIn") {
      if (part.type !== "battery") return say("커넥터가 맞지 않습니다.");
      w.batt = "pm";
    } else if (tg.kind === "harness") {
      if (!(part.type === "esc" && tip.key === "tel")) return say("커넥터가 맞지 않습니다.");
      w.escTelem[pos] = "harness";
    } else if (tg.kind === "fcPort") {
      const c = tipCable(tip);
      if (!c) return say("이 선은 FC에 꽂지 않습니다.");
      if (SIM.CABLES[c].conn !== SIM.portType(tg.port)) return say("커넥터 모양이 맞지 않아 " + tg.port + "에 들어가지 않습니다.");
      SIM.setPlug(c, tg.port);
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
      if (sc.held) { // 나사·렌치를 들고 있을 때: 케이스·렌치를 직접 눌렀는지 먼저 보고, 아니면 화면에서 가장 가까운 구멍
        const th = ray.intersectObjects(Object.values(toolObjs), true).find((x) => x.object.userData.bin || x.object.userData.key);
        if (th) return th.object.userData.bin ? { bin: th.object.userData.bin, point: th.point } : { key: th.object.userData.key, point: th.point };
        const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, wp = new T.Vector3();
        let best = null, bd = 22;
        for (const hm of holeHit) { const key = hm.userData.hole; if (!SIM.state.install[key.split(":")[0]]) continue; hm.getWorldPosition(wp); const sp = toScreen(wp); const d = Math.hypot(sp.x - mx, sp.y - my); if (sp.vis && d < bd) { bd = d; best = { hole: key, point: wp.clone() }; } }
        if (best) return best;
      }
      const see = sc.xray || !!sc.pick;
      let soft = null; // 넉넉한 클릭 영역(작은 부품·선): 바로 뒤에 단자·선 끝이 있으면 그쪽을 고른다
      const hard = (h, res) => (!soft || h.distance < soft.d + 0.04 ? res : soft.res);
      for (const h of ray.intersectObjects(list, true)) {
        if (h.object === liveWire || h.object === snapRing || !h.object.visible) continue;
        if (see && h.object === sc.topPlate) continue; // 투시 중에는 상판을 지나 아래를 누른다
        if (sc.pick && h.object.material !== HIT) continue; // 연결 중에는 단자·선 끝만 찾는다
        if (h.object.material === HIT) {
          const ud = h.object.userData;
          if (!sc.pick && ud.txBox) return hard(h, { txBox: true, point: h.point });
          if (!sc.pick && ud.bin) return hard(h, { bin: ud.bin, point: h.point });
          if (!sc.pick && ud.key) return hard(h, { key: ud.key, point: h.point });
          if (!sc.pick && ud.hole) { if (SIM.state.install[ud.hole.split(":")[0]]) return hard(h, { hole: ud.hole, point: h.point }); continue; }
          if (ud.bind && !sc.pick) return hard(h, { bind: true, part: ud.bind, point: h.point });
          if (ud.tip) { const t = ud.tip; if (SIM.state.install[t.part]) return hard(h, { tip: t, point: h.point }); continue; }
          if (ud.target) { const tg = ud.target; if (sc.pick && (!tg.part || SIM.state.install[tg.part])) return { target: tg, point: h.point }; const id = partOf(h.object); if (id) return hard(h, { part: id, point: h.point }); continue; }
          if (!sc.pick && ud.wire) { if (!soft) soft = { d: h.distance, res: { wire: ud.wire, point: h.point } }; continue; }
          if (!sc.pick && ud.partHit) { if (!soft) soft = { d: h.distance, res: { part: ud.partHit, point: h.point } }; continue; }
          continue;
        }
        if (wires.children.includes(h.object) || expectGroup.children.includes(h.object)) continue;
        { let o = h.object, tool = false; while (o) { if (o.userData.tool) { tool = true; break; } o = o.parent; } if (tool) continue; } // 공구 장식은 지나친다
        if (soft) return soft.res;
        const id = partOf(h.object);
        if (id) return { part: id, point: h.point };
        return { frame: true, point: h.point };
      }
      if (soft) return soft.res;
      return { point: ray.ray.intersectPlane(plane, hitP) ? hitP.clone() : null };
    }
    const canEdit = () => sc.env === "bench" && !sc.dragDrone && !SIM.flight.active;

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = 0;
      down = null;
      if (pts.size === 1 && canEdit() && !sc.pick && !sc.held) { const h = pickAt(e); if (h.tip) down = { tip: h.tip }; else if (h.part) down = { id: h.part }; }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId);
      if (!p) { // 버튼을 누르지 않은 이동: 커서 모양과 연결 미리보기
        if (!canEdit()) return;
        const h = pickAt(e);
        canvas.style.cursor = sc.pick ? (h.target ? "copy" : "crosshair") : h.tip || h.bin || h.key || h.hole || h.txBox ? "pointer" : h.part ? "grab" : "default";
        if (sc.pick) { if (h.point) drawLiveWire(h.point); }
        if (sc.held) { canvas.style.cursor = h.hole ? "copy" : "crosshair"; if (sc.onHover) sc.onHover(heldLabel(), e.clientX, e.clientY); return; }
        if (sc.onHover) sc.onHover(sc.pick ? (h.target ? h.target.label : "") : h.bin ? "M" + h.bin + " 나사" : h.key ? h.key + " 육각렌치" : h.txBox ? "조종기 (TX12)" : "", e.clientX, e.clientY);
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) orbit.dist = clampDist(orbit.dist * (pinch / d));
        pinch = d; moved = 99; down = null; return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (down && down.tip && moved > 6) { // 선 끝을 끌어서 연결
        if (!sc.wireDrag) { startPick(down.tip); sc.wireDrag = true; }
        const h = pickAt(e); if (h.point) drawLiveWire(h.point);
        if (sc.onHover) sc.onHover(h.target ? h.target.label : "", e.clientX, e.clientY);
        return;
      }
      if (down && moved > 6) { dragMove(e); if (down) return; }
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
        if (SIM.state.install[id] && SIM.dependents(SIM.state.install[id]).length) { down = null; return; } // 위에 붙은 부품이 있으면 떼지 않고 시점만 돌린다
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
        if (sc.onHover) sc.onHover(SIM.slotName(best.slot), e.clientX, e.clientY);
      } else {
        snapRing.visible = false;
        plane.constant = 0;
        if (ray.ray.intersectPlane(plane, hitP)) {
          const l = partsRoot.worldToLocal(hitP.clone());
          l.x = Math.max(-0.75, Math.min(0.75, l.x)); l.z = Math.max(-0.52, Math.min(0.52, l.z)); l.y = 0.03;
          g.userData.tp = l; g.userData.tq = new T.Quaternion();
        }
        if (sc.onHover) sc.onHover("", e.clientX, e.clientY);
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
      if (sc.wireDrag) { // 끌던 선을 놓은 자리
        const h = pickAt(e); down = null;
        if (h.target) finishPick(h.target); else { sc.cancelPick(); SIM.emit(); }
        if (sc.pick) { sc.cancelPick(); SIM.emit(); }
        return;
      }
      down = null;
      if (moved > 6 || e.type !== "pointerup" || !canEdit()) return;
      const h = pickAt(e);
      if (sc.pick) {
        if (h.target) finishPick(h.target);
        else if (h.tip) { sc.cancelPick(); startPick(h.tip); }
        else { sc.cancelPick(); SIM.emit(); }
        return;
      }
      if (sc.held) { // 나사를 끼우거나 렌치로 조이기·풀기
        if (h.hole) {
          const cur = SIM.state.screws[h.hole];
          if (sc.held.kind === "screw") { if (cur) return SIM.toast("이미 나사가 있습니다.", "bad"); const err = SIM.putScrew(h.hole, sc.held.size); if (err) SIM.toast(err, "bad"); }
          else { const r = SIM.turnScrew(h.hole, sc.held.size); if (r !== "tightened" && r !== "loosened") SIM.toast(r, "bad"); }
          return;
        }
        if (h.bin && sc.held.kind === "screw") return setHeld({ kind: "screw", size: h.bin });
        if (h.key) return setHeld(sc.held.kind === "key" && sc.held.size === h.key ? null : { kind: "key", size: h.key });
        return setHeld(null);
      }
      if (h.txBox) { if (sc.onTx) sc.onTx(); return; }
      if (h.bin) return setHeld({ kind: "screw", size: h.bin });
      if (h.key) return setHeld({ kind: "key", size: h.key });
      if (h.hole) { if (SIM.state.screws[h.hole]) { const err = SIM.takeScrew(h.hole); if (err) SIM.toast(err, "bad"); } else if (sc.onPick) sc.onPick(h.hole.split(":")[0]); return; }
      if (h.tip) return startPick(h.tip);
      if (h.wire) { if (sc.onWire) sc.onWire(h.wire, e.clientX, e.clientY); return; }
      if (h.bind) { if (!SIM.state.install.rx) { if (sc.onPick) sc.onPick("rx"); return; } const r = SIM.bindRx(); SIM.toast(BIND_MSG[r] !== undefined ? BIND_MSG[r] : r, BIND_MSG[r] !== undefined ? "" : "bad"); return; }
      if (sc.onPick) sc.onPick(h.part || null);
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("dblclick", (e) => { if (!pickAt(e).part) sc.home(); });
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); orbit.dist = clampDist(orbit.dist * Math.exp(e.deltaY * 0.001)); }, { passive: false });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (sc.pick) { sc.cancelPick(); SIM.emit(); } if (sc.held) setHeld(null); } });
  }
  const clampDist = (d) => Math.min(sc.env === "field" ? 60 : 7, Math.max(0.35, d));
  sc.zoom = (f) => { orbit.dist = clampDist(orbit.dist * f); };
  sc.view = (name) => {
    const v = { top: [0, 0.12], front: [Math.PI, 1.3], back: [0, 1.15], side: [Math.PI / 2, 1.3] }[name];
    orbit.theta = v[0]; orbit.phi = v[1];
  };
  // 선택한 부품 쪽으로 시점 이동
  sc.focus = (id) => { const g = objs[id] && objs[id].group; if (!g) return; const c = new T.Box3().setFromObject(g).getCenter(new T.Vector3()); orbit.target.copy(c); orbit.dist = Math.min(orbit.dist, 1.2); };
  sc.home = () => { orbit.target.set(0, 0.2, 0.16); orbit.dist = 2.75; orbit.theta = 0.3; orbit.phi = 0.86; };

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
      const A = air[id], flow = pr && u > 0.03 ? ph.thrust : 0;
      const showSpin = u > 0.03 && m && !SIM.flight.active; A.cw.visible = showSpin && ph.dir === "cw"; A.ccw.visible = showSpin && ph.dir === "ccw";
      if (showSpin) A[ph.dir].rotation.z += (ph.dir === "ccw" ? 1 : -1) * dt * 3; // 추력 방향과 반대로 공기가 흐른다
      A.m.opacity = flow ? Math.min(0.55, 0.2 + u) * Math.min(1, Math.abs(flow) + 0.3) : 0;
      if (flow) { airT += dt * (0.6 + 2 * u) * 0.25; A.g.children.forEach((c) => { const t = (c.userData.ph + airT) % 1; c.position.y = flow > 0 ? -0.01 - t * 0.14 : 0.02 + t * 0.14; }); }
    }
    for (const p of SIM.PARTS) if (!SIM.state.install[p.id] && objs[p.id].disc) objs[p.id].disc.material.opacity = 0;
    if (selBox.visible && SIM.selected) selBox.setFromObject(objs[SIM.selected].group);
    { const led = SIM.rxLed(), t = performance.now(); objs.rx.led.material.color.setHex(led === "green" ? 0x33ff66 : led === "red" ? 0xff3322 : led === "blink" ? (t % 1000 < 500 ? 0xff3322 : 0x330000) : led === "fast" ? (t % 200 < 100 ? 0xff3322 : 0x330000) : 0x222222); }
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
