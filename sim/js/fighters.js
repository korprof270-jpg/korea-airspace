// 전투기형 드론 프레임: 동체(회전체)·날개(얇은 판 압출)·꼬리날개·공기흡입구·조종석 유리·엔진 노즐에
// 덕트 팬(날개 속 프로펠러)을 품은 형태. 기존 X 프레임과 크기가 비슷하도록 5인치 기준(m)으로 짠다. 전방 = -Z
import * as THREE from "../vendor/three.module.min.js";

export const FIGHTER_FRAMES = {
  raptor: { name: "랩터", desc: "삼각 날개에 덕트 팬 넷, 쌍 수직 꼬리날개의 제공 전투기형" },
  viper: { name: "바이퍼", desc: "가늘고 긴 동체, 앞날개(카나드)와 날개 끝 엔진 포드의 고속 요격기형" },
  phantom: { name: "팬텀", desc: "톱니 꼬리선의 전익(全翼) 스텔스 기체, 팬이 날개 속에 숨어 있다" },
  cross: { name: "크로스윙", desc: "X자로 벌어지는 네 날개 끝에 엔진, 원통 동체의 돌격기형" },
};
export const isFighter = (f) => !!FIGHTER_FRAMES[f];

// 동체: 반지름 프로필 [[r, z], ...] 을 Z 축으로 돌린 회전체. sy 로 위아래를 눌러 납작하게
function fuselage(prof, seg = 14) {
  const pts = prof.map(([r, z]) => new THREE.Vector2(Math.max(0.0005, r), z));
  const geo = new THREE.LatheGeometry(pts, seg);
  geo.rotateX(Math.PI / 2);          // 회전축 Y → Z
  return geo;
}
// 날개 판: 위에서 본 외곽선 [[x, z], ...] 을 두께 t 로 (가운데 정렬). 모서리를 살짝 깎는다
function plate(outline, t) {
  const s = new THREE.Shape();
  outline.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  s.closePath();
  const b = Math.min(t * 0.35, 0.0012);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.0002, t - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 4 });
  geo.translate(0, 0, -(t - 2 * b) / 2);
  geo.rotateX(-Math.PI / 2);         // 외곽선 평면(XY) → 수평(XZ), 두께는 Y
  return geo;
}
const mirror = (o) => o.map(([x, z]) => [-x, z]);

// 덕트(팬 둘레 통): 위·아래 테 + 짧은 원통 벽
function duct(add, M, x, y, z, r, h = 0.016) {
  const wall = add(new THREE.CylinderGeometry(r + 0.004, r + 0.004, h, 22, 1, true), M.frame, x, y, z);
  wall.material = M.frameIn;
  const lip = add(new THREE.TorusGeometry(r + 0.004, 0.0035, 6, 26), M.accent, x, y + h / 2, z); lip.rotation.x = Math.PI / 2;
  const lo = add(new THREE.TorusGeometry(r + 0.004, 0.0025, 6, 26), M.dark, x, y - h / 2, z); lo.rotation.x = Math.PI / 2;
  // 팬 고정 살 (십자)
  for (let i = 0; i < 2; i++) { const st = add(new THREE.BoxGeometry(r * 2, 0.002, 0.003), M.dark, x, y - h * 0.3, z); st.rotation.y = i * Math.PI / 2 + Math.PI / 4; }
}
// 엔진 노즐: 어두운 통 + 안쪽 빛
function nozzle(add, M, x, y, z, r, len = 0.02) {
  const n = add(new THREE.CylinderGeometry(r, r * 1.15, len, 14, 1, true), M.dark, x, y, z); n.rotation.x = Math.PI / 2;
  n.material = M.darkIn;
  const ring = add(new THREE.TorusGeometry(r * 1.12, r * 0.18, 6, 16), M.metal, x, y, z + len / 2); ring.rotation.x = 0;
  const glow = add(new THREE.CircleGeometry(r * 0.92, 16), M.led, x, y, z + len * 0.35); glow.rotation.y = Math.PI;
  return glow;
}
// 조종석 유리 (반구를 길게 늘인 것)
function canopy(add, M, z, len, w, y) {
  const c = add(new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.glass, 0, y, z);
  c.scale.set(w, w * 0.85, len);
  const frame = add(new THREE.TorusGeometry(1, 0.06, 4, 20, Math.PI), M.dark, 0, y, z + len * 0.2); frame.scale.set(w, w * 0.85, 1);
  return c;
}
// 날개 끝·꼬리 항법등 (좌 빨강, 우 초록 대신 기체 LED 색 + 흰색)
function navLight(add, M, x, y, z) { add(new THREE.SphereGeometry(0.0035, 6, 5), M.led, x, y, z); }

// 반환: { motors: [[x,z],...], propR, motorY, bodyLen, nose: [x,y,z], tail: Mesh }
export function buildFighter(frame, add, M) {
  switch (frame) {
    // ── 랩터: 삼각 날개 + 덕트 팬 넷 + 쌍 꼬리날개 ──
    case "raptor": {
      add(fuselage([[0, -0.17], [0.012, -0.15], [0.022, -0.11], [0.028, -0.05], [0.03, 0.04], [0.027, 0.11], [0.022, 0.14], [0, 0.145]]), M.frame, 0, 0.012, 0).scale.y = 0.62;
      // 날개(덕트 자리에 구멍 대신 덕트가 위에 얹힌 구조)
      const wing = [[0.022, -0.09], [0.07, -0.05], [0.148, 0.06], [0.15, 0.105], [0.11, 0.11], [0.06, 0.13], [0.022, 0.13]];
      add(plate(wing, 0.006), M.frame, 0, 0.006, 0); add(plate(mirror(wing), 0.006), M.frame, 0, 0.006, 0);
      // 날개 앞전 색 띠
      for (const s of [-1, 1]) { const e = add(new THREE.BoxGeometry(0.004, 0.007, 0.15), M.accent, s * 0.087, 0.007, 0.006); e.rotation.y = s * 0.7; }
      // 공기흡입구
      for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.016, 0.016, 0.06), M.dark, s * 0.03, 0.006, -0.05); add(new THREE.BoxGeometry(0.017, 0.017, 0.004), M.accent, s * 0.03, 0.006, -0.081); }
      // 쌍 수직 꼬리날개 (바깥으로 기울어짐)
      for (const s of [-1, 1]) {
        const fin = add(plate([[0, 0.07], [0, 0.135], [0.045, 0.15], [0.05, 0.12]], 0.004), M.accent, s * 0.035, 0.02, 0);
        fin.rotation.z = s > 0 ? Math.PI / 2 - 0.35 : Math.PI / 2 + 0.35; fin.position.y = 0.022;
      }
      // 수평 꼬리날개
      for (const s of [-1, 1]) add(plate([[0.02, 0.12], [0.075, 0.15], [0.075, 0.17], [0.02, 0.16]].map(([x, z]) => [s * x, z]), 0.004), M.frame, 0, 0.008, 0);
      canopy(add, M, -0.075, 0.05, 0.017, 0.022);
      const tail = nozzle(add, M, 0, 0.012, 0.15, 0.014);
      for (const s of [-1, 1]) navLight(add, M, s * 0.15, 0.008, 0.1);
      return { motors: [[-0.085, -0.025], [0.085, -0.025], [-0.105, 0.075], [0.105, 0.075]], propR: 0.036, motorY: 0.007, bodyLen: 0.32, nose: [0, 0.012, -0.17], tail, ducted: true };
    }
    // ── 바이퍼: 긴 동체 + 카나드 + 후퇴익 끝 엔진 포드 ──
    case "viper": {
      add(fuselage([[0, -0.2], [0.008, -0.18], [0.016, -0.13], [0.022, -0.06], [0.024, 0.06], [0.021, 0.13], [0.016, 0.16], [0, 0.165]]), M.frame, 0, 0.014, 0).scale.y = 0.75;
      const wing = [[0.02, 0.0], [0.13, 0.08], [0.135, 0.11], [0.02, 0.11]];
      add(plate(wing, 0.005), M.frame, 0, 0.01, 0); add(plate(mirror(wing), 0.005), M.frame, 0, 0.01, 0);
      const can = [[0.018, -0.115], [0.075, -0.085], [0.075, -0.07], [0.018, -0.075]];
      add(plate(can, 0.004), M.accent, 0, 0.014, 0); add(plate(mirror(can), 0.004), M.accent, 0, 0.014, 0);
      // 등 줄기 + 꼬리날개 하나
      add(new THREE.BoxGeometry(0.012, 0.012, 0.16), M.frame, 0, 0.026, 0.03);
      add(plate([[0, 0.07], [0, 0.155], [0.055, 0.17], [0.05, 0.13]], 0.004), M.accent, 0, 0.03, 0).rotation.z = Math.PI / 2;
      // 엔진 포드 (팬 덕트를 감싼 나셀)
      for (const s of [-1, 1]) {
        add(fuselage([[0, -0.05], [0.012, -0.035], [0.013, 0.03], [0.008, 0.05], [0, 0.052]], 10), M.dark, s * 0.135, 0.008, 0.095);
        add(new THREE.BoxGeometry(0.004, 0.005, 0.07), M.accent, s * 0.135, 0.02, 0.095);
      }
      canopy(add, M, -0.1, 0.045, 0.015, 0.024);
      const tail = nozzle(add, M, 0, 0.014, 0.165, 0.012);
      for (const s of [-1, 1]) navLight(add, M, s * 0.075, 0.016, -0.078);
      return { motors: [[-0.075, -0.09], [0.075, -0.09], [-0.135, 0.095], [0.135, 0.095]], propR: 0.033, motorY: 0.012, bodyLen: 0.36, nose: [0, 0.014, -0.2], tail, ducted: true, podY: 0.008 };
    }
    // ── 팬텀: 톱니 꼬리선 전익 스텔스 ──
    case "phantom": {
      const half = [[0, -0.15], [0.18, 0.04], [0.18, 0.07], [0.135, 0.09], [0.09, 0.06], [0.045, 0.09], [0, 0.065]];
      add(plate(half, 0.012), M.frame, 0, 0.008, 0); add(plate(mirror(half), 0.012), M.frame, 0, 0.008, 0);
      // 가운데 볼록한 등 (각진 덮개)
      const hump = add(new THREE.OctahedronGeometry(1, 0), M.frame, 0, 0.016, -0.02); hump.scale.set(0.04, 0.016, 0.11);
      add(new THREE.BoxGeometry(0.05, 0.008, 0.012), M.dark, 0, 0.022, -0.06);           // 등 흡입구
      for (const s of [-1, 1]) { const e = add(new THREE.BoxGeometry(0.003, 0.013, 0.23), M.accent, s * 0.09, 0.009, -0.055); e.rotation.y = s * 0.76; }
      canopy(add, M, -0.085, 0.035, 0.016, 0.018);
      // 납작한 배기구 두 개
      const tail = add(new THREE.BoxGeometry(0.05, 0.006, 0.004), M.led, 0, 0.012, 0.072);
      for (const s of [-1, 1]) navLight(add, M, s * 0.18, 0.009, 0.055);
      return { motors: [[-0.065, 0.0], [0.065, 0.0], [-0.12, 0.045], [0.12, 0.045]], propR: 0.03, motorY: 0.02, bodyLen: 0.26, nose: [0, 0.012, -0.15], tail, ducted: true, flat: true };
    }
    // ── 크로스윙: X 자 날개 넷 + 날개 끝 엔진 ──
    default: {
      add(fuselage([[0, -0.19], [0.01, -0.17], [0.018, -0.1], [0.022, 0.0], [0.024, 0.08], [0.022, 0.12], [0, 0.125]]), M.frame, 0, 0.012, 0);
      add(new THREE.BoxGeometry(0.03, 0.02, 0.05), M.dark, 0, 0.02, 0.06);               // 등 뒤 기관부
      const wing = [[0.015, 0.03], [0.12, 0.07], [0.12, 0.1], [0.015, 0.11]];
      for (const s of [-1, 1]) for (const v of [-1, 1]) {
        const p = add(plate(s > 0 ? wing : mirror(wing), 0.004), M.frame, 0, 0.012, 0);
        p.rotation.z = s * v * 0.32;
        const st = add(new THREE.BoxGeometry(0.1, 0.003, 0.006), M.accent, s * 0.068, 0.012 + v * 0.02, 0.05); st.rotation.z = s * v * 0.32;
      }
      for (const s of [-1, 1]) for (const v of [-1, 1]) add(fuselage([[0, -0.04], [0.009, -0.03], [0.01, 0.03], [0, 0.04]], 8), M.dark, s * 0.118, 0.012 + v * 0.04, 0.05);
      canopy(add, M, -0.075, 0.04, 0.015, 0.02);
      const tail = nozzle(add, M, 0, 0.012, 0.125, 0.012);
      return { motors: [[-0.118, 0.05, 0.052], [0.118, 0.05, 0.052], [-0.118, 0.05, -0.028], [0.118, 0.05, -0.028]], propR: 0.03, motorY: 0.012, bodyLen: 0.31, nose: [0, 0.012, -0.19], tail, ducted: true };
    }
  }
}
