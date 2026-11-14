// 드론 정비 시뮬레이터 — 3D 작업대, 부품 모델, 카메라, 선택
(function () {
  const SIM = window.SIM, T = THREE;
  const sc = (SIM.scene = { env: "bench", showExpect: false, dragDrone: false, poseName: "level", lift: 0, tumble: 0 });
  const objs = (sc.objs = {});
  const K = (sc.K = 2.2); // 2종(7~25kg)급 기체 크기로 확대
  const ARM_R = 0.225, S2 = Math.SQRT1_2, REST_Y = 0.09 * K;
  let renderer, scene, camera, drone, benchGroup, fieldGroup, partsRoot, wires, slotGroup, expectGroup, selBox, sun;
  const air = {};
  const orbit = { theta: 0.45, phi: 0.95, dist: 2.7, target: new T.Vector3(0, 0.2, 0) };
  const poseQ = new T.Quaternion();
  sc.poseQ = poseQ;

  const mat = (color, o) => new T.MeshStandardMaterial(Object.assign({ color: new T.Color(color).convertSRGBToLinear(), roughness: 0.6, metalness: 0.1 }, o || {}));
  const M = {
    carbon: mat(0x22262a, { roughness: 0.45 }), red: mat(0xc8382e), white: mat(0xe9ecec), steel: mat(0xb9c0c4, { metalness: 0.8, roughness: 0.3 }),
    dark: mat(0x16181a), blue: mat(0x2b62c4), yellow: mat(0xe2b322), copper: mat(0xb86b2c, { metalness: 0.6, roughness: 0.4 }),
    prop: mat(0x2c2f33, { roughness: 0.35 }), green: mat(0x2f8a54),
  };
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

  // ---------- 부품 모델 (원점 = 장착면 중앙) ----------
  function makePart(part) {
    const g = new T.Group();
    g.userData.partId = part.id;
    const o = { group: g };
    if (part.type === "motor") {
      g.add(cyl(0.0135, 0.008, M.dark, 0, 0.004, 0));
      const bell = new T.Group();
      bell.add(cyl(0.014, 0.016, M.steel, 0, 0.017, 0));
      bell.add(cyl(0.0025, 0.012, M.steel, 0, 0.03, 0, 10));
      bell.add(cyl(0.0055, 0.004, part.thread === "cw" ? M.dark : M.steel, 0, 0.0345, 0, 6));
      bell.add(box(0.004, 0.0012, 0.012, M.red, 0, 0.0256, 0.007));
      g.add(bell); o.spinner = bell;
    } else if (part.type === "prop") {
      const sp = new T.Group(), pitch = part.dir === "ccw" ? 0.3 : -0.3;
      const geo = new T.BoxGeometry(0.115, 0.0018, 0.024);
      const b1 = mesh(geo, M.prop, 0.066, 0.004, 0); b1.rotation.x = pitch;
      const b2 = mesh(geo, M.prop, -0.066, 0.004, 0); b2.rotation.x = -pitch;
      sp.add(b1, b2, cyl(0.009, 0.008, M.dark, 0, 0.004, 0), cyl(0.0062, 0.001, M.white, 0, 0.0084, 0), box(0.03, 0.0006, 0.005, M.white, 0.04, 0.0052, 0), box(0.03, 0.0006, 0.005, M.white, -0.04, 0.0052, 0));
      const disc = new T.Mesh(new T.CircleGeometry(0.125, 40), new T.MeshBasicMaterial({ color: 0x9aa6a8, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.004;
      g.add(sp, disc); o.spinner = sp; o.disc = disc;
    } else if (part.type === "esc") {
      g.add(box(0.024, 0.008, 0.048, M.blue, 0, 0.004, 0), box(0.018, 0.0012, 0.02, M.yellow, 0, 0.0086, 0));
    } else if (part.type === "fc") {
      g.add(box(0.05, 0.015, 0.082, M.dark, 0, 0.0075, 0));
      const d = arrowDecal(0.044, 0.066, "FC", "#1b1e22"); d.position.y = 0.0152; g.add(d);
      g.add(box(0.03, 0.006, 0.004, M.steel, 0, 0.006, 0.042));
    } else if (part.type === "pm") {
      g.add(box(0.022, 0.009, 0.05, M.dark, 0, 0.0045, 0), box(0.016, 0.009, 0.012, M.yellow, 0, 0.0045, 0.03));
    } else if (part.type === "battery") {
      g.add(box(0.046, 0.034, 0.135, M.blue, 0, 0.017, 0), box(0.0465, 0.012, 0.136, M.dark, 0, 0.017, 0), box(0.016, 0.009, 0.014, M.yellow, 0.012, 0.022, 0.074));
    } else if (part.type === "gps") {
      g.add(cyl(0.003, 0.07, M.carbon, 0, 0.035, 0, 8), cyl(0.012, 0.003, M.carbon, 0, 0.0015, 0), cyl(0.03, 0.012, M.dark, 0, 0.076, 0, 32));
      const d = arrowDecal(0.03, 0.045, "GPS", "#1b1e22"); d.position.y = 0.0822; g.add(d);
    } else if (part.type === "rx") {
      g.add(box(0.024, 0.01, 0.04, mat(0x3a3f45), 0, 0.005, 0), box(0.02, 0.0006, 0.012, M.white, 0, 0.0104, 0));
      const a1 = cyl(0.0008, 0.07, M.dark, -0.006, 0.03, 0.022, 6); a1.rotation.x = 0.5;
      const a2 = cyl(0.0008, 0.07, M.dark, 0.006, 0.03, 0.022, 6); a2.rotation.x = 0.5; a2.rotation.z = -0.5;
      g.add(a1, a2);
    } else if (part.type === "telem") {
      g.add(box(0.024, 0.01, 0.046, M.green, 0, 0.005, 0), cyl(0.003, 0.075, M.dark, 0, 0.045, 0.02, 8));
    }
    objs[part.id] = o;
    return g;
  }

  function buildFrame() {
    const g = new T.Group();
    const plate = (w, d, y) => { const p = mesh(new T.CylinderGeometry(0.5, 0.5, 0.003, 8), M.carbon, 0, y, 0); p.scale.set(w * 1.08, 1, d * 1.08); p.rotation.y = Math.PI / 8; return p; };
    g.add(plate(0.21, 0.21, -0.0015), plate(0.13, 0.16, 0.0385));
    // 하판 일체형 배전판(PDB): 구리 패드와 +/− 인쇄
    const pcb = mesh(new T.CylinderGeometry(0.5, 0.5, 0.0006, 8), mat(0x143d2c, { roughness: 0.5 }), 0, 0.0004, 0); pcb.scale.set(0.2 * 1.08, 1, 0.2 * 1.08); pcb.rotation.y = Math.PI / 8; pcb.castShadow = false; g.add(pcb);
    const silk = (ch) => { const p = new T.Mesh(new T.PlaneGeometry(0.011, 0.011), new T.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { c.fillStyle = "#143d2c"; c.fillRect(0, 0, 64, 64); c.fillStyle = "#fff"; c.font = "bold 58px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, 32, 34); }) })); p.rotation.x = -Math.PI / 2; return p; };
    for (const key in PADS) for (const sgn of ["plus", "minus"]) {
      const a = PADS[key][sgn];
      g.add(box(0.014, 0.0012, 0.014, sgn === "plus" ? M.copper : M.steel, a[0], 0.001, a[1]));
      const s = silk(sgn === "plus" ? "+" : "−"), k = 1 + 0.016 / Math.hypot(a[0], a[1]);
      s.position.set(a[0] * k, 0.0011, a[1] * k); g.add(s);
    }
    for (const id of SIM.POS_IDS) {
      const p = SIM.POS[id], a = new T.Group();
      a.rotation.y = Math.atan2(p.x, p.z);
      a.add(box(0.03, 0.016, 0.2, p.z < 0 ? M.red : M.white, 0, 0.002, 0.14));
      a.add(cyl(0.02, 0.004, M.carbon, 0, 0.008, ARM_R));
      const leg = box(0.008, 0.094, 0.014, M.carbon, 0, -0.045, 0.165); leg.rotation.x = 0.12; a.add(leg);
      a.add(box(0.02, 0.006, 0.03, M.dark, 0, -0.088, 0.17));
      g.add(a);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.003, 0.038, M.steel, sx * 0.045, 0.018, sz * 0.06, 8));
    return g;
  }

  // PDB 패드 위치 (기체 기준 x, z)
  const PADS = { batt: { plus: [-0.014, 0.09], minus: [0.014, 0.09] } };
  for (const id of SIM.POS_IDS) { const p = SIM.POS[id], dx = p.x * S2, dz = p.z * S2; PADS[id] = { plus: [dx * 0.088 - dz * 0.027, dz * 0.088 + dx * 0.027], minus: [dx * 0.088 + dz * 0.027, dz * 0.088 - dx * 0.027] }; }

  // 슬롯의 기체 기준 위치·방향
  function slotXform(slot, part) {
    const [t, pos] = slot.split("@"), st = SIM.state;
    if (pos) {
      const p = SIM.POS[pos], ry = Math.atan2(p.x, p.z);
      if (t === "motor") return { p: [p.x * ARM_R * S2, 0.01, p.z * ARM_R * S2], ry };
      if (t === "prop") { const fl = part && st.flip[part.id]; return { p: [p.x * ARM_R * S2, fl ? 0.052 : 0.043, p.z * ARM_R * S2], ry: 0, rx: fl ? Math.PI : 0 }; }
      return { p: [p.x * 0.115 * S2, 0.01, p.z * 0.115 * S2], ry };
    }
    return {
      fc: { p: [0, 0.04, -0.008], ry: (-st.rot.fc * Math.PI) / 2 },
      pm: { p: [0, 0, 0], ry: 0 },
      battery: { p: [0, -0.04, 0], ry: 0 },
      gps: { p: [0, 0.04, 0.062], ry: (-st.rot.gps * Math.PI) / 2 },
      rx: { p: [-0.046, 0.04, -0.01], ry: 0 },
      telem: { p: [0.046, 0.04, -0.01], ry: 0 },
    }[slot];
  }
  const SLOT_SIZE = { motor: [0.034, 0.03, 0.034], esc: [0.03, 0.014, 0.054], prop: [0.06, 0.012, 0.06], fc: [0.056, 0.02, 0.088], pm: [0.03, 0.014, 0.056], battery: [0.052, 0.038, 0.14], gps: [0.04, 0.09, 0.04], rx: [0.03, 0.016, 0.046], telem: [0.03, 0.016, 0.052] };

  // 작업대 위 부품 보관 위치 (partsRoot 기준 좌표)
  function homeOf(part) {
    const n = +(part.id.match(/\d+$/) || [1])[0] - 1;
    if (part.type === "motor") return { p: [-0.6, 0, -0.26 + n * 0.1], ry: 0 };
    if (part.type === "esc") return { p: [-0.49, 0, -0.26 + n * 0.1], ry: 0 };
    if (part.type === "prop") return { p: [0.6, 0, -0.27 + n * 0.085], ry: 0 };
    const row = { fc: -0.3, pm: -0.19, battery: -0.08, gps: 0.05, rx: 0.16, telem: 0.26 };
    return { p: [row[part.type], 0, 0.42], ry: 0 };
  }

  // ---------- 배선 ----------
  function tube(points, color, r) {
    const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(p[0], p[1], p[2])));
    const m = new T.Mesh(new T.TubeGeometry(curve, 20, r || 0.0013, 5), mat(color, { roughness: 0.8 }));
    m.castShadow = true;
    return m;
  }
  function portPos(port) {
    let m;
    if ((m = /^MAIN OUT (\d)$/.exec(port))) return [(m[1] - 4.5) * 0.0055, 0.046, 0.034];
    if ((m = /^AUX OUT (\d)$/.exec(port))) return [(m[1] - 3.5) * 0.0055, 0.053, 0.034];
    return { "RC IN": [-0.023, 0.05, 0.034], "SBUS OUT": [0.023, 0.05, 0.034], POWER: [-0.012, 0.05, -0.05], GPS: [0.012, 0.05, -0.05], TELEM1: [0.026, 0.052, -0.035], TELEM2: [0.026, 0.052, -0.012], I2C: [-0.026, 0.052, -0.012], CAN: [-0.026, 0.052, -0.035] }[port];
  }
  function rebuildWires() {
    while (wires.children.length) { const c = wires.children.pop(); c.geometry.dispose(); }
    const st = SIM.state, w = st.wiring, fcIn = SIM.has("fc");
    const RED = 0xc8281e, BLK = 0x141414;
    const pad = (a) => [a[0], 0.003, a[1]];
    const pair = (from, pads, rev, lift) => { // 빨강·검정 전원선 한 쌍
      const pl = pad(rev ? pads.minus : pads.plus), mi = pad(rev ? pads.plus : pads.minus);
      wires.add(tube([[from[0] - 0.004, from[1], from[2]], [(from[0] + pl[0]) / 2, lift, (from[2] + pl[2]) / 2], pl], RED, 0.0022));
      wires.add(tube([[from[0] + 0.004, from[1], from[2]], [(from[0] + mi[0]) / 2, lift, (from[2] + mi[2]) / 2], mi], BLK, 0.0022));
    };
    const sigCol = [0xf2f2f2, 0xf0a030, 0x6ad06a, 0x60b8f0];
    SIM.POS_IDS.forEach((id, i) => {
      const p = SIM.POS[id];
      if (!SIM.has("esc@" + id)) return;
      const e = [p.x * 0.115 * S2, 0.02, p.z * 0.115 * S2];
      const order = w.motorWires[id];
      if (SIM.has("motor@" + id) && order) { // 모터선 세 가닥 (노랑·파랑·초록), ESC 단자 순서대로
        const tx = -p.z * S2, tz = p.x * S2, cols = [0xe0c020, 0x2c6fd0, 0x2f9a4a];
        for (let k = 0; k < 3; k++) {
          const mo = (k - 1) * 0.006, eo = (+order[k] - 2) * 0.006;
          wires.add(tube([[p.x * 0.14 * S2 + tx * eo, 0.019, p.z * 0.14 * S2 + tz * eo], [p.x * 0.175 * S2 + tx * (mo + eo) / 2, 0.026, p.z * 0.175 * S2 + tz * (mo + eo) / 2], [p.x * 0.208 * S2 + tx * mo, 0.016, p.z * 0.208 * S2 + tz * mo]], cols[k], 0.0018));
        }
      }
      if (w.escPwr[id]) pair([p.x * 0.092 * S2, 0.017, p.z * 0.092 * S2], PADS[id], w.escPwr[id] === "rev", 0.02);
      const port = w.plug["esc" + id];
      if (fcIn && port) { const end = portPos(port); wires.add(tube([e, [e[0] * 0.8, 0.05, e[2] * 0.8 + 0.01], [end[0] * 2, 0.064, 0.064], [end[0], end[1] + 0.006, 0.046], end], sigCol[i], 0.0014)); }
    });
    const devStart = { pm: [0, 0.01, -0.024], gps: [0.004, 0.046, 0.058], compass: [-0.004, 0.046, 0.058], rx: [-0.046, 0.05, -0.03], telem: [0.046, 0.05, -0.034] };
    const devCol = { pm: 0xb04030, gps: 0x3a78d8, compass: 0x8a5ad0, rx: 0x44b060, telem: 0xd8c040 };
    for (const d in devStart) {
      const port = w.plug[d];
      if (!port || !fcIn || !SIM.cableReady(d)) continue;
      const a = devStart[d], b = portPos(port);
      const mid = d === "pm" ? [0.0, 0.03, -0.09] : d === "gps" || d === "compass" ? [(d === "gps" ? 0.06 : -0.06), 0.08, 0.0] : [(a[0] + b[0]) / 2 + Math.sign(a[0]) * 0.02, 0.07, (a[2] + b[2]) / 2];
      wires.add(tube([a, [a[0], a[1] + 0.012, a[2] - 0.006], mid, [b[0], b[1] + 0.012, b[2]], b], devCol[d], 0.0016));
    }
    const hasB = SIM.has("battery"), bat = [0.012, -0.018, 0.074];
    if (hasB && w.batt === "pm" && SIM.has("pm")) wires.add(tube([bat, [0.034, -0.012, 0.115], [0.028, 0.014, 0.1], [0, 0.006, 0.034]], RED, 0.0032));
    if (hasB && w.batt === "pdb") pair([0.012, -0.016, 0.076], PADS.batt, false, 0.0), wires.add(tube([bat, [0.02, -0.012, 0.112], [0, 0.004, 0.1]], RED, 0.0032));
    if (SIM.has("pm") && w.pmOut) pair([0, 0.008, 0.03], PADS.batt, w.pmOut === "rev", 0.016);
  }

  function rebuildSlots() {
    while (slotGroup.children.length) slotGroup.remove(slotGroup.children[0]);
    const part = SIM.selected && SIM.part(SIM.selected);
    if (!part || SIM.state.install[part.id] || sc.env !== "bench") return;
    for (const slot of SIM.slotsFor(part)) {
      if (SIM.canInstall(part, slot)) continue;
      const x = slotXform(slot, null), s = SLOT_SIZE[part.type];
      const m = new T.Mesh(new T.BoxGeometry(s[0], s[1], s[2]), new T.MeshBasicMaterial({ color: 0x2fd3ae, transparent: true, opacity: 0.5, depthWrite: false }));
      m.position.set(x.p[0], x.p[1] + s[1] / 2, x.p[2]); m.rotation.y = x.ry;
      m.userData.slotId = slot;
      slotGroup.add(m);
    }
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
      const o = objs[part.id], g = o.group, slot = SIM.state.install[part.id];
      const x = slot ? slotXform(slot, part) : homeOf(part), parent = slot ? drone : partsRoot;
      if (g.parent !== parent) parent.attach(g);
      g.userData.tp = new T.Vector3(x.p[0], x.p[1], x.p[2]);
      g.userData.tq = new T.Quaternion().setFromEuler(new T.Euler(x.rx || 0, x.ry, 0, "YXZ"));
    }
    rebuildWires(); rebuildSlots(); rebuildExpect();
    const sel = SIM.selected && objs[SIM.selected];
    selBox.visible = !!sel && sc.env === "bench";
    if (sel) selBox.setFromObject(sel.group);
  };

  sc.setEnv = function (env) {
    sc.env = env;
    benchGroup.visible = partsRoot.visible = env === "bench";
    fieldGroup.visible = env === "field";
    applyTheme();
    if (env === "bench") { orbit.target.set(0, 0.2, 0); orbit.dist = 2.7; sc.setPose("level"); drone.position.set(0, REST_Y, 0); drone.quaternion.identity(); }
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
    wires = new T.Group(); slotGroup = new T.Group(); expectGroup = new T.Group();
    drone.add(wires, slotGroup, expectGroup);
    partsRoot = new T.Group(); partsRoot.scale.setScalar(K);
    scene.add(drone, partsRoot);
    for (const part of SIM.PARTS) { const g = makePart(part), h = homeOf(part); g.position.set(h.p[0], h.p[1], h.p[2]); partsRoot.add(g); }
    // 프로펠러 바람(공기 흐름) 표시
    for (const id of SIM.POS_IDS) {
      const g = new T.Group(); g.position.set(SIM.POS[id].x * ARM_R * S2, 0.045, SIM.POS[id].z * ARM_R * S2); drone.add(g);
      const m = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 0.03 + (i % 5) * 0.02; const st = new T.Mesh(new T.BoxGeometry(0.003, 0.03, 0.003), m); st.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); st.userData.ph = i / 10; g.add(st); }
      air[id] = { g, m };
    }
    selBox = new T.BoxHelper(drone, 0xffb020); selBox.visible = false; scene.add(selBox);

    applyTheme();
    try {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
      new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) {}
    bindPointer(canvas);
    const stage = canvas.parentElement;
    const resize = () => { const w = stage.clientWidth || 300, h = stage.clientHeight || 200; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    try { new ResizeObserver(resize).observe(stage); } catch (e) { window.addEventListener("resize", resize); }
    resize();
    sc.sync();
    SIM.on(sc.sync);
  };

  // ---------- 조작: 드래그 회전, 휠/핀치 확대, 클릭 선택 ----------
  function bindPointer(canvas) {
    const pts = new Map(); let moved = 0, pinch = 0;
    const ray = new T.Raycaster(), v2 = new T.Vector2();
    canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = 0; });
    canvas.addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) orbit.dist = clampDist(orbit.dist * (pinch / d));
        pinch = d; moved = 99; return;
      }
      moved += Math.abs(dx) + Math.abs(dy);
      if (sc.dragDrone && sc.env === "bench") {
        const right = new T.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), dx * 0.01).multiply(new T.Quaternion().setFromAxisAngle(right, dy * 0.01));
        poseQ.premultiply(q); sc.poseName = "free"; sc.lift = 0.75;
      } else {
        orbit.theta -= dx * 0.008;
        orbit.phi = Math.min(1.52, Math.max(0.12, orbit.phi - dy * 0.008));
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (moved > 6 || sc.env !== "bench" || e.type !== "pointerup") return;
      const r = canvas.getBoundingClientRect();
      v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v2, camera);
      const sh = ray.intersectObjects(slotGroup.children, false)[0];
      if (sh && SIM.selected) { const err = SIM.install(SIM.selected, sh.object.userData.slotId); if (err) SIM.toast(err, "bad"); return; }
      const hit = ray.intersectObjects(SIM.PARTS.map((p) => objs[p.id].group), true)[0];
      let id = null;
      if (hit) { let o = hit.object; while (o && !o.userData.partId) o = o.parent; id = o && o.userData.partId; }
      if (sc.onPick) sc.onPick(id);
    };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); orbit.dist = clampDist(orbit.dist * Math.exp(e.deltaY * 0.001)); }, { passive: false });
  }
  const clampDist = (d) => Math.min(sc.env === "field" ? 60 : 7, Math.max(0.5, d));
  sc.zoom = (f) => { orbit.dist = clampDist(orbit.dist * f); };
  sc.view = (name) => {
    const v = { top: [0, 0.12], front: [Math.PI, 1.3], back: [0, 1.15], side: [Math.PI / 2, 1.3] }[name];
    orbit.theta = v[0]; orbit.phi = v[1];
  };

  const tmpQ = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
  let pulse = 0, airT = 0;
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
      const rate = u > 0.01 ? s * (4 + 26 * u) * dt : 0;
      if (m) objs[m.id].spinner.rotateOnAxis(yAxis, rate);
      if (pr) { objs[pr.id].spinner.rotateOnAxis(yAxis, rate); objs[pr.id].disc.material.opacity = Math.min(0.32, u * 0.7); }
      if (pr) objs[pr.id].group.visible = !(SIM.flight.active && SIM.flight.lost[id]);
      const A = air[id], flow = pr && u > 0.03 ? ph.thrust : 0; // 추력 방향과 반대로 공기가 흐른다
      A.m.opacity = flow ? Math.min(0.55, 0.2 + u) * Math.min(1, Math.abs(flow) + 0.3) : 0;
      if (flow) { airT += dt * (0.6 + 2 * u) * 0.25; A.g.children.forEach((c) => { const t = (c.userData.ph + airT) % 1; c.position.y = flow > 0 ? -0.01 - t * 0.13 : 0.02 + t * 0.13; }); }
    }
    for (const p of SIM.PARTS) if (!SIM.state.install[p.id] && objs[p.id].disc) objs[p.id].disc.material.opacity = 0;
    pulse += dt;
    slotGroup.children.forEach((m) => (m.material.opacity = 0.38 + 0.22 * Math.sin(pulse * 5)));
    if (selBox.visible && SIM.selected) selBox.setFromObject(objs[SIM.selected].group);

    if (sc.env === "field") orbit.target.lerp(drone.position, 1 - Math.exp(-6 * dt));
    const sp = Math.sin(orbit.phi);
    camera.position.set(orbit.target.x + orbit.dist * sp * Math.sin(orbit.theta), Math.max(0.05, orbit.target.y + orbit.dist * Math.cos(orbit.phi)), orbit.target.z + orbit.dist * sp * Math.cos(orbit.theta));
    camera.lookAt(orbit.target);
    sun.position.set(orbit.target.x + 1.8, orbit.target.y + 5.5, orbit.target.z + 2.4);
    sun.target.position.copy(orbit.target);
    renderer.render(scene, camera);
  };
})();
