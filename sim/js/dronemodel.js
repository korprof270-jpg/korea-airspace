// 드론 외형: 프레임·캐노피·프로펠러·LED·스킨을 조합해 절차적으로 만든다 (전방 = -Z)
import * as THREE from "../vendor/three.module.min.js";
import { toonMat } from "./toon.js";

export const FRAMES = {
  x: { name: "트루 X", desc: "대칭형 레이싱 프레임" },
  stretch: { name: "스트레치 X", desc: "앞뒤로 긴 고속형" },
  deadcat: { name: "데드캣", desc: "앞 암이 벌어진 촬영형" },
  whoop: { name: "덕트 우프", desc: "프로펠러 가드 일체형" },
  hexa: { name: "헥사콥터", desc: "모터 6개 대형 기체" },
  tri: { name: "트라이콥터", desc: "모터 3개 Y자 기체" },
};
export const CANOPIES = {
  pod: { name: "유선형 포드" },
  racer: { name: "레이싱 캐노피" },
  battery: { name: "탑 배터리" },
  cine: { name: "액션캠 마운트" },
};
export const SKINS = {
  solid: { name: "단색" }, stripe: { name: "레이싱 스트라이프" }, camo: { name: "카모" },
  carbon: { name: "카본" }, hazard: { name: "경고 무늬" }, flame: { name: "불꽃" },
};
export const LED_MODES = { solid: "항상 켜짐", blink: "점멸", rainbow: "무지개", off: "끄기" };
export const COLOR_PRESETS = [
  { name: "오렌지 블레이즈", frameColor: "#1b1f27", accentColor: "#ff5a1f", propColor: "#21d4fd", ledColor: "#3dff7c" },
  { name: "네온 사이버", frameColor: "#14121f", accentColor: "#ff2bd6", propColor: "#00f0ff", ledColor: "#ff2bd6" },
  { name: "스텔스", frameColor: "#101114", accentColor: "#3a3f47", propColor: "#2b2e33", ledColor: "#ff3030" },
  { name: "태극", frameColor: "#f2f2f2", accentColor: "#cd2e3a", propColor: "#0047a0", ledColor: "#ffffff" },
  { name: "포레스트", frameColor: "#263322", accentColor: "#8bc34a", propColor: "#d4e157", ledColor: "#ffeb3b" },
  { name: "골드 러시", frameColor: "#1a1a1a", accentColor: "#ffc400", propColor: "#fff3c4", ledColor: "#ffc400" },
];

function skinTexture(skin, base, accent) {
  if (skin === "solid") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = accent;
  if (skin === "stripe") { g.fillRect(48, 0, 12, 128); g.fillRect(68, 0, 12, 128); }
  else if (skin === "camo") {
    let s = 5;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.35 + r() * 0.5;
      g.beginPath(); g.ellipse(r() * 128, r() * 128, 8 + r() * 18, 5 + r() * 12, r() * 3, 0, 7); g.fill();
    }
  } else if (skin === "carbon") {
    g.globalAlpha = 0.35;
    for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) if (((x + y) / 8) % 2 === 0) g.fillRect(x, y, 8, 8);
  } else if (skin === "hazard") {
    for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i - 112, 128); g.lineTo(i - 128, 128); g.fill(); }
  } else if (skin === "flame") {
    for (let i = 0; i < 7; i++) {
      const x = i * 20 + 4;
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + 2, 70, x + 10, 34 + (i % 3) * 16); g.quadraticCurveTo(x + 16, 80, x + 20, 128); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// 모터 위치(단위: m, 5인치 기준). [x, z]
function motorLayout(frame) {
  switch (frame) {
    case "stretch": return [[-0.075, -0.1], [0.075, -0.1], [-0.075, 0.1], [0.075, 0.1]];
    case "deadcat": return [[-0.115, -0.06], [0.115, -0.06], [-0.07, 0.1], [0.07, 0.1]];
    case "whoop": return [[-0.075, -0.075], [0.075, -0.075], [-0.075, 0.075], [0.075, 0.075]];
    case "hexa": return [0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; return [Math.cos(a) * 0.14, Math.sin(a) * 0.14]; });
    case "tri": return [[-0.1, -0.07], [0.1, -0.07], [0, 0.12]];
    default: return [[-0.085, -0.085], [0.085, -0.085], [-0.085, 0.085], [0.085, 0.085]];
  }
}

// look: settings.drone 형태. 반환 Group 의 userData.tick(dt, thrust, time) 로 프로펠러·LED 를 움직인다
export function buildDrone(look, scale = 1, opts = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  g.scale.setScalar(scale);
  root.add(g);

  const tex = skinTexture(look.skin, look.frameColor, look.accentColor);
  // 툰 재질: 또렷한 하이라이트와 림 라이트로 작은 기체도 윤곽이 읽히게 한다
  const frameMat = toonMat({ color: tex ? 0xffffff : look.frameColor, map: tex, spec: 0.45, shine: 40, rim: 0.55 });
  const accentMat = toonMat({ color: look.accentColor, spec: 0.65, shine: 60, rim: 0.6 });
  const darkMat = toonMat({ color: 0x242830, spec: 0.4, shine: 30, rim: 0.45 });
  const propMat = toonMat({ color: look.propColor, transparent: true, opacity: 0.95 });
  const discMat = new THREE.MeshBasicMaterial({ color: look.propColor, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  const ledMat = new THREE.MeshBasicMaterial({ color: look.ledColor });
  const lensMat = toonMat({ color: 0x0c0c18, spec: 1, shine: 90 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };

  const frame = look.frame || "x";
  const motors = motorLayout(frame);
  const propR = frame === "whoop" ? 0.05 : frame === "hexa" ? 0.058 : 0.0635;

  // 중앙 플레이트
  const bodyLen = frame === "stretch" ? 0.17 : frame === "hexa" ? 0.12 : 0.15;
  const bodyW = frame === "hexa" ? 0.1 : 0.045;
  add(new THREE.BoxGeometry(bodyW, 0.006, bodyLen), frameMat, 0, 0, 0);
  add(new THREE.BoxGeometry(bodyW * 0.9, 0.005, bodyLen * 0.92), frameMat, 0, 0.026, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.003, 0.003, 0.026, 6), accentMat, sx * bodyW * 0.38, 0.013, sz * bodyLen * 0.4);

  // 암 + 모터 + 프로펠러
  const props = [];
  motors.forEach(([mx, mz], i) => {
    const len = Math.hypot(mx, mz);
    const arm = add(new THREE.BoxGeometry(0.014, 0.005, len), frameMat, mx / 2, 0, mz / 2);
    arm.rotation.y = Math.atan2(mx, mz);
    add(new THREE.CylinderGeometry(0.013, 0.014, 0.018, 12), darkMat, mx, 0.012, mz);
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 12), accentMat, mx, 0.022, mz);
    const hub = new THREE.Group();
    hub.position.set(mx, 0.028, mz);
    const n = look.props === 2 ? 2 : 3;
    for (let b = 0; b < n; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(propR, 0.0015, 0.013), propMat);
      blade.position.x = propR / 2;
      const piv = new THREE.Group();
      piv.rotation.y = (b / n) * Math.PI * 2;
      blade.rotation.x = 0.25;
      piv.add(blade);
      hub.add(piv);
    }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(propR, 20), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(mx, 0.029, mz);
    g.add(hub, disc);
    props.push({ hub, dir: i % 2 ? 1 : -1 });
    if (frame === "whoop") {
      const duct = add(new THREE.TorusGeometry(propR + 0.006, 0.006, 6, 20), accentMat, mx, 0.026, mz);
      duct.rotation.x = Math.PI / 2;
      const duct2 = add(new THREE.TorusGeometry(propR + 0.006, 0.004, 6, 20), frameMat, mx, 0.012, mz);
      duct2.rotation.x = Math.PI / 2;
    }
    // 암 끝 LED
    add(new THREE.BoxGeometry(0.012, 0.004, 0.006), ledMat, mx * 0.82, -0.005, mz * 0.82);
  });
  if (frame === "tri") add(new THREE.BoxGeometry(0.01, 0.03, 0.04), accentMat, 0, 0.02, 0.15); // 꼬리 서보 핀

  // 캐노피
  const cy = 0.03;
  switch (look.canopy) {
    case "racer": {
      const c = add(new THREE.ConeGeometry(0.03, 0.11, 5), accentMat, 0, cy + 0.012, -0.01);
      c.rotation.x = -Math.PI / 2; c.scale.set(1, 1, 0.55);
      break;
    }
    case "battery": {
      add(new THREE.BoxGeometry(0.036, 0.03, 0.085), darkMat, 0, cy + 0.016, 0.01);
      add(new THREE.BoxGeometry(0.04, 0.004, 0.02), accentMat, 0, cy + 0.032, 0.01);
      break;
    }
    case "cine": {
      add(new THREE.BoxGeometry(0.04, 0.02, 0.07), frameMat, 0, cy + 0.01, 0.02);
      add(new THREE.BoxGeometry(0.045, 0.034, 0.03), darkMat, 0, cy + 0.03, -0.04);
      const l = add(new THREE.CylinderGeometry(0.011, 0.011, 0.01, 12), lensMat, 0, cy + 0.032, -0.058);
      l.rotation.x = Math.PI / 2;
      break;
    }
    default: {
      const c = add(new THREE.SphereGeometry(0.03, 14, 10), accentMat, 0, cy + 0.004, 0);
      c.scale.set(0.8, 0.62, 2.1);
    }
  }
  // FPV 카메라 + 안테나
  const camBox = add(new THREE.BoxGeometry(0.02, 0.02, 0.016), darkMat, 0, 0.016, -bodyLen / 2 - 0.004);
  camBox.rotation.x = 0.45;
  const lens = add(new THREE.CylinderGeometry(0.007, 0.007, 0.012, 10), lensMat, 0, 0.02, -bodyLen / 2 - 0.014);
  lens.rotation.x = Math.PI / 2 - 0.45;
  const ant = add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.07, 5), darkMat, 0, 0.05, bodyLen / 2);
  ant.rotation.x = -0.5;
  add(new THREE.SphereGeometry(0.006, 8, 6), accentMat, 0, 0.082, bodyLen / 2 + 0.018);
  // 후방 LED 바
  const tail = add(new THREE.BoxGeometry(bodyW * 0.9, 0.008, 0.004), ledMat, 0, 0.013, bodyLen / 2 + 0.002);

  // 적/아군 식별용 발광 고리(전투 모드)
  let halo = null;
  if (opts.halo) {
    halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.halo).multiplyScalar(2.2) }));
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  let spin = 0;
  const ledBase = new THREE.Color(look.ledColor).multiplyScalar(2.6);
  root.userData.tick = (dt, thrust = 0.3, time = 0) => {
    const w = 25 + thrust * 190;
    spin += w * dt;
    for (const p of props) p.hub.rotation.y = spin * p.dir;
    // 회전이 빠를수록 블레이드는 흐려지고 원판이 보인다
    const blur = Math.min(1, Math.max(0, (w - 40) / 90));
    propMat.opacity = 0.95 - blur * 0.75;
    propMat.depthWrite = blur < 0.5;   // 흐려진 블레이드에는 외곽선이 생기지 않게 깊이를 쓰지 않는다
    discMat.opacity = blur * 0.22;
    const mode = look.ledMode || "solid";
    if (mode === "off") ledMat.color.setRGB(0.03, 0.03, 0.03);
    else if (mode === "blink") ledMat.color.copy(ledBase).multiplyScalar(Math.sin(time * 9) > 0 ? 1 : 0.08);
    else if (mode === "rainbow") ledMat.color.setHSL((time * 0.4) % 1, 1, 0.55).multiplyScalar(2.6);
    else ledMat.color.copy(ledBase);
  };
  root.userData.tail = tail;
  root.userData.dispose = () => {
    root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const m of [frameMat, accentMat, darkMat, propMat, discMat, ledMat, lensMat]) m.dispose();
    if (tex) tex.dispose();
    if (halo) halo.material.dispose();
  };
  return root;
}

// AI 드론용 외형(팀 색상별)
export function botLook(kind, team) {
  const red = team !== 0;
  const base = {
    frame: "x", canopy: "racer", props: 3, skin: "solid", ledMode: "blink",
    frameColor: red ? "#2a1114" : "#101b2e", accentColor: red ? "#ff2d3d" : "#2f8cff",
    propColor: red ? "#ff7a7a" : "#8ec5ff", ledColor: red ? "#ff2020" : "#40a0ff",
  };
  if (kind === "kamikaze") return { ...base, frame: "tri", canopy: "pod", accentColor: "#ffb300", ledColor: "#ffb300", ledMode: "blink" };
  if (kind === "gunship") return { ...base, frame: "hexa", canopy: "battery", skin: "hazard" };
  if (kind === "boss") return { ...base, frame: "hexa", canopy: "cine", skin: "carbon", accentColor: "#b000ff", ledColor: "#ff00d0", ledMode: "rainbow" };
  if (kind === "racer") return { ...base, frame: "stretch", canopy: "racer" };
  return base;
}
