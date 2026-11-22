// 장착 파츠 외형: 슬롯마다 장착한 부품과 업그레이드 단계에 따라 기체에 작은 부품 형상을 붙인다 (전방 = -Z, 단위 m · 5인치 기준)
// parts: { slot: { v, lv } } (garage.partLook). A: 프레임별 부착점 (dronemodel.js 가 넘긴다)
//   laser [x,y,z] 기수 아래 · pods [x,y,z] 좌우 대칭 무장 자리 · belly [x,y,z] 배 · sensor [x,y,z] 등/옆 돛대 밑동
//   shield [x,y,z] 좌우 대칭 발생기 자리 · cooler [x,y,z] 좌우 대칭 뒤쪽 윗면 · plates [[x,y,z,ry,len],...] 장갑판 · nose [x,y,z] 기수 윗면
//   motors [[x,y,z],...] 모터 중심 · mr 모터 반지름
// 단계 표시: 3단계에서 포인트색 덧부품, 5단계에서 LED 발광 부품이 더 붙는다. 반환: 매 프레임 부를 함수 목록
import * as THREE from "../vendor/three.module.min.js";

export function addParts(add, M, A, parts) {
  const ticks = [], G = new Map();
  if (!parts || !A) return ticks;
  // 같은 모양은 한 번만 만든다
  const geo = (key, mk) => { let g = G.get(key); if (!g) G.set(key, (g = mk())); return g; };
  const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cyl = (r, h, n = 10, r2 = r, open = false) => geo(`c${r}|${r2}|${h}|${n}|${open}`, () => new THREE.CylinderGeometry(r, r2, h, n, 1, open));
  const tor = (r, t, n = 18) => geo(`t${r}|${t}|${n}`, () => new THREE.TorusGeometry(r, t, 5, n));
  const sph = (r) => geo(`s${r}`, () => new THREE.SphereGeometry(r, 8, 6));
  // 앞뒤(Z)로 누운 원통·고리
  const zc = (r, h, mat, x, y, z, n, r2, open) => { const m = add(cyl(r, h, n, r2, open), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };
  const zt = (r, t, mat, x, y, z) => add(tor(r, t), mat, x, y, z);
  const ft = (r, t, mat, x, y, z) => { const m = add(tor(r, t), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };   // 수평 고리
  const P = (slot) => parts[slot] || { v: "std", lv: 0 };
  const hi = (p) => p.lv >= 3, max = (p) => p.lv >= 5;

  // ── 레이저 포: 기수 아래 ──
  {
    const p = P("laser"), [x, y, z] = A.laser;
    add(box(0.014, 0.007, 0.028), M.dark, x, y + 0.004, z + 0.012);
    if (p.v === "rapid") {
      // 속사형: 가는 포신 셋이 삼각으로 묶인 개틀링 + 드럼
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 2; zc(0.0019, 0.056, M.metal, x + Math.cos(a) * 0.0042, y + Math.sin(a) * 0.0042, z - 0.022, 6); }
      zc(0.0085, 0.008, M.dark, x, y, z + 0.004, 10); zc(0.0072, 0.004, M.accent, x, y, z - 0.03, 10);
      if (hi(p)) add(box(0.012, 0.012, 0.022), M.accent, x + 0.013, y + 0.002, z + 0.012);        // 탄 급전 상자
      if (max(p)) zt(0.0075, 0.0014, M.led, x, y, z - 0.05);
    } else if (p.v === "rail") {
      // 고출력형: 긴 레일 두 줄 + 뒤쪽 축전 블록
      for (const s of [-1, 1]) add(box(0.003, 0.009, 0.095), M.metal, x + s * 0.0052, y, z - 0.04);
      add(box(0.018, 0.013, 0.02), M.accent, x, y + 0.001, z + 0.012);
      add(box(0.005, 0.0025, 0.08), hi(p) ? M.led : M.dark, x, y, z - 0.036);
      if (hi(p)) for (const k of [0, 1]) add(box(0.016, 0.004, 0.003), M.accent, x, y, z - 0.03 - k * 0.03);
      if (max(p)) for (const s of [-1, 1]) add(box(0.002, 0.004, 0.02), M.led, x + s * 0.0075, y, z - 0.085);
    } else if (p.v === "scatter") {
      // 확산형: 부채꼴로 벌어진 짧은 포신 셋 + 넓은 앞판
      for (const s of [-1, 0, 1]) { const m = zc(0.0032, 0.036, M.metal, x + s * 0.0085, y, z - 0.014, 8); m.rotation.z = s * 0.32; m.position.x += s * 0.004; }
      add(box(0.034, 0.006, 0.005), M.accent, x, y, z + 0.002);
      if (hi(p)) for (const s of [-1, 0, 1]) { const m = zc(0.0052, 0.008, M.accent, x + s * 0.0135, y, z - 0.033, 8, 0.0034); m.rotation.z = s * 0.32; }
      if (max(p)) for (const s of [-1, 0, 1]) add(sph(0.0028), M.led, x + s * 0.0145, y, z - 0.038);
    } else if (p.v === "ion") {
      // 이온 블래스터: 코일을 감은 굵은 포신 + 끝의 빛나는 구
      zc(0.0042, 0.05, M.dark, x, y, z - 0.016, 10);
      for (let k = 0; k < (hi(p) ? 4 : 3); k++) zt(0.0058, 0.0016, M.accent, x, y, z - 0.004 - k * 0.011);
      add(sph(0.005), max(p) ? M.led : M.metal, x, y, z - 0.044);
      if (max(p)) zt(0.0078, 0.0011, M.led, x, y, z - 0.044);
    } else {
      // 펄스: 포신 하나 + 포구 고리
      zc(0.0034, 0.05, M.metal, x, y, z - 0.018, 8);
      zt(0.005, 0.0013, M.accent, x, y, z - 0.04);
      if (hi(p)) { zt(0.005, 0.0013, M.accent, x, y, z - 0.028); add(box(0.016, 0.002, 0.012), M.accent, x, y, z - 0.004); }
      if (max(p)) add(sph(0.0034), M.led, x, y, z - 0.044);
    }
  }

  // ── 미사일 포드: 좌우 대칭 ──
  {
    const p = P("missile"), [px, y, z] = A.pods;
    for (const s of [-1, 1]) {
      const x = s * px;
      if (p.v === "swarm") {
        // 다연장: 넓은 상자에 발사구 여러 개
        add(box(0.022, 0.014, 0.04), M.frame, x, y, z);
        add(box(0.02, 0.012, 0.002), M.dark, x, y, z - 0.021);
        for (const k of [-1, 0, 1]) add(box(0.004, 0.009, 0.003), M.accent, x + k * 0.0062, y, z - 0.0215);
        if (hi(p)) add(box(0.024, 0.003, 0.03), M.accent, x, y + 0.0085, z);
        if (max(p)) { add(box(0.018, 0.008, 0.034), M.frame, x, y - 0.011, z); add(box(0.014, 0.004, 0.002), M.led, x, y - 0.011, z - 0.018); }
      } else if (p.v === "heavy") {
        // 대형 탄두: 큰 미사일 한 발씩 (5단계: 두 발)
        const one = (ox) => {
          add(box(0.004, 0.006, 0.03), M.dark, x + ox, y + 0.008, z);
          zc(0.0065, 0.066, M.metal, x + ox, y, z, 10);
          zc(0.0005, 0.02, M.accent, x + ox, y, z - 0.043, 10, 0.0065);
          for (const r of [0, 1]) { const f = add(box(0.022, 0.0015, 0.014), M.accent, x + ox, y, z + 0.027); f.rotation.z = r * Math.PI / 2 + Math.PI / 4; }
          if (hi(p)) zt(0.0068, 0.0014, M.accent, x + ox, y, z - 0.012);
        };
        one(0);
        if (max(p)) { one(s * 0.017); add(box(0.003, 0.003, 0.012), M.led, x, y + 0.012, z + 0.02); }
      } else if (p.v === "seeker") {
        // 추적 미사일: 레일 위 가늘고 긴 탄 둘 + 앞쪽 탐색기 렌즈
        add(box(0.016, 0.003, 0.06), M.dark, x, y + 0.006, z);
        for (const k of [-1, 1]) {
          const ox = x + k * 0.0045;
          zc(0.0028, 0.062, M.metal, ox, y, z, 8);
          add(sph(0.003), max(p) ? M.led : M.accent, ox, y, z - 0.031);
          const f = add(box(0.011, 0.001, 0.008), M.accent, ox, y, z + 0.027); f.rotation.z = Math.PI / 4;
        }
        if (hi(p)) add(box(0.006, 0.006, 0.012), M.accent, x, y + 0.01, z + 0.015);
      } else {
        // 표준 포드: 상자형 2연장
        add(box(0.014, 0.012, 0.05), M.frame, x, y, z);
        add(box(0.012, 0.01, 0.002), M.dark, x, y, z - 0.026);
        for (const k of [-1, 1]) zc(0.0026, 0.006, M.accent, x + k * 0.0032, y, z - 0.027, 8, 0.0012);
        if (hi(p)) add(box(0.0155, 0.003, 0.02), M.accent, x, y + 0.006, z + 0.008);
        if (max(p)) { add(box(0.01, 0.009, 0.04), M.frame, x + s * 0.012, y, z + 0.004); add(box(0.008, 0.002, 0.03), M.led, x + s * 0.012, y + 0.0055, z + 0.004); }
      }
    }
  }

  // ── 프레임·장갑: 암(날개) 위 장갑판 + 기수 판 ──
  {
    const p = P("armor"), [nx, ny, nz] = A.nose;
    A.plates.forEach(([x, y, z, ry, len]) => {
      let m;
      if (p.v === "reactive") {
        // 반응 장갑: 작은 폭발 반응 블록을 줄지어 붙인다
        const n = 3;
        for (let k = 0; k < n; k++) { m = add(box(0.016, 0.006, len / n * 0.8), k % 2 ? M.accent : M.dark, x, y + 0.003, z); m.rotation.y = ry; m.translateZ((k - (n - 1) / 2) * len / n); }
        if (max(p)) { m = add(box(0.003, 0.0025, len), M.led, x, y + 0.007, z); m.rotation.y = ry; }
      } else if (p.v === "bumper") {
        // 범퍼 케이지: 팔 위 둥근 보호 봉
        m = zc(0.0024, len * 1.1, M.metal, x, y + 0.006, z, 6); m.rotation.set(Math.PI / 2, 0, 0); m.rotation.order = "YXZ"; m.rotation.y = ry;
        if (hi(p)) { m = add(box(0.012, 0.004, 0.004), M.accent, x, y + 0.006, z); m.rotation.y = ry; }
      } else if (p.v === "ti") {
        m = add(box(0.024, 0.006, len), M.metal, x, y + 0.002, z); m.rotation.y = ry;
        if (hi(p)) { const t = add(box(0.014, 0.003, len * 0.7), M.accent, x, y + 0.0065, z); t.rotation.y = ry; }
      } else if (p.v === "light") {
        for (const k of [-1, 1]) { m = add(box(0.003, 0.004, len * 1.15), M.accent, x, y + 0.001, z); m.rotation.y = ry; m.translateX(k * 0.009); }
        if (max(p)) { m = add(box(0.002, 0.002, len), M.led, x, y + 0.003, z); m.rotation.y = ry; }
      } else {
        m = add(box(0.018, 0.003, len * 0.8), M.dark, x, y, z); m.rotation.y = ry;
        if (hi(p)) { const t = add(box(0.005, 0.0035, len * 0.8), M.accent, x, y + 0.0012, z); t.rotation.y = ry; }
        if (max(p)) { const t = add(box(0.0018, 0.0035, len * 0.7), M.led, x, y + 0.002, z); t.rotation.y = ry; }
      }
    });
    if (p.v === "reactive") {
      for (const s of [-1, 0, 1]) add(box(0.014, 0.01, 0.006), s ? M.dark : M.accent, nx + s * 0.015, ny - 0.004, nz - 0.004);
      if (hi(p)) add(box(A.bw * 0.8, 0.003, 0.012), M.dark, nx, ny + 0.003, nz + 0.01);
    } else if (p.v === "bumper") {
      // 기체를 두르는 원형 케이지
      const R = Math.max(0.07, A.bw * 1.4), cage = ft(R, 0.0028, M.metal, 0, ny - 0.002, 0);
      cage.scale.set(1, (Math.abs(nz) + 0.006) / R, 1);
      for (const s of [-1, 1]) add(box(0.004, 0.02, 0.004), M.dark, nx + s * 0.03, ny - 0.008, nz + 0.004);
      if (max(p)) add(box(0.04, 0.003, 0.003), M.led, nx, ny - 0.002, nz - 0.006);
    } else if (p.v === "ti") {
      add(box(A.bw, 0.008, 0.007), M.metal, nx, ny - 0.006, nz - 0.004);                   // 기수 범퍼
      add(box(0.03, 0.004, 0.03), M.metal, nx, ny + 0.002, nz + 0.02);
      if (max(p)) for (const s of [-1, 1]) add(box(0.004, 0.014, 0.05), M.accent, nx + s * (A.bw / 2 - 0.001), ny - 0.006, nz + 0.03);
    } else if (p.v === "light") {
      for (const s of [-1, 1]) { const w = add(box(0.03, 0.002, 0.012), hi(p) ? M.accent : M.frame, nx + s * 0.026, ny, nz + 0.012); w.rotation.z = s * 0.35; w.rotation.y = -s * 0.3; }   // 작은 앞날개
    } else if (hi(p)) add(box(A.bw * 0.7, 0.004, 0.005), M.dark, nx, ny - 0.006, nz - 0.003);
  }

  // ── 모터·추진: 모터마다 ──
  {
    const p = P("motor"), r = A.mr;
    A.motors.forEach(([x, y, z]) => {
      if (p.v === "race") {
        // 레이싱: 방열 원판 + 뾰족한 스피너
        add(cyl(r + 0.005, 0.0018, 14), M.metal, x, y + 0.002, z);
        add(cyl(0.0005, 0.016, 10, r * 0.5), M.accent, x, y + 0.02, z);
        if (hi(p)) add(cyl(r + 0.0035, 0.0018, 14), M.metal, x, y - 0.004, z);
        if (max(p)) ft(r + 0.005, 0.0013, M.led, x, y - 0.008, z);
      } else if (p.v === "eco") {
        // 효율 모터: 모터 둘레 방열 지느러미
        const n = hi(p) ? 8 : 6;
        for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, f = add(box(0.0016, 0.012, 0.005), M.metal, x + Math.cos(a) * (r + 0.002), y - 0.002, z + Math.sin(a) * (r + 0.002)); f.rotation.y = -a; }
        ft(r + 0.002, 0.0013, M.accent, x, y + 0.005, z);
        if (max(p)) ft(r + 0.0045, 0.0011, M.led, x, y - 0.008, z);
      } else if (p.v === "jet") {
        // 제트 보조 추진기: 모터 옆에 뒤를 향한 작은 노즐
        const sx = Math.sign(x) || 1;
        zc(0.0042, 0.022, M.dark, x - sx * (r + 0.005), y - 0.004, z + 0.006, 10, 0.0055);
        zc(0.0058, 0.003, M.accent, x - sx * (r + 0.005), y - 0.004, z + 0.018, 10);
        if (hi(p)) zc(0.0035, 0.002, M.metal, x - sx * (r + 0.005), y - 0.004, z - 0.006, 10);
        if (max(p)) zc(0.0038, 0.0015, M.led, x - sx * (r + 0.005), y - 0.004, z + 0.0195, 10);
      } else if (p.v === "torque") {
        // 고토크: 모터를 감싼 굵은 통
        add(cyl(r + 0.006, 0.013, 14, r + 0.004, true), M.frame, x, y - 0.002, z).material = M.frameIn || M.frame;
        ft(r + 0.006, 0.0022, M.dark, x, y - 0.0085, z);
        if (hi(p)) ft(r + 0.006, 0.0018, M.accent, x, y + 0.0045, z);
        if (max(p)) ft(r + 0.0085, 0.0013, M.led, x, y - 0.002, z);
      } else {
        ft(r + 0.0012, 0.0014, M.dark, x, y - 0.007, z);
        if (hi(p)) ft(r + 0.0012, 0.0014, M.accent, x, y + 0.001, z);
        if (max(p)) ft(r + 0.003, 0.0011, M.led, x, y - 0.009, z);
      }
    });
  }

  // ── 배터리·동력: 배 아래 ──
  {
    const p = P("battery"), [x, y, z] = A.belly;
    if (p.v === "cell") {
      add(box(0.03, 0.017, 0.062), M.dark, x, y - 0.003, z);
      for (const k of [-1, 1]) add(box(0.032, 0.018, 0.005), M.accent, x, y - 0.003, z + k * 0.018);
      if (hi(p)) for (const s of [-1, 1]) add(box(0.002, 0.006, 0.05), M.metal, x + s * 0.016, y - 0.003, z);
      if (max(p)) add(box(0.016, 0.004, 0.002), M.led, x, y - 0.003, z + 0.032);
    } else if (p.v === "solar") {
      // 태양광: 배 아래 셀 + 양옆으로 펼친 패널 날개
      add(box(0.022, 0.01, 0.044), M.dark, x, y, z);
      for (const s of [-1, 1]) {
        const w = add(box(0.05, 0.002, 0.04), M.dark, x + s * 0.036, y + 0.003, z); w.rotation.z = s * 0.18;
        for (let k = 0; k < 3; k++) { const l = add(box(0.048, 0.0024, 0.0015), M.accent, x + s * 0.036, y + 0.003, z - 0.013 + k * 0.013); l.rotation.z = s * 0.18; }
        if (max(p)) { const l = add(box(0.002, 0.0026, 0.038), M.led, x + s * 0.06, y + 0.0075, z); l.rotation.z = s * 0.18; }
      }
      if (hi(p)) add(box(0.024, 0.004, 0.004), M.accent, x, y - 0.006, z + 0.02);
    } else if (p.v === "reactor") {
      // 소형 리액터: 빛나는 노심 원통 + 띠
      zc(0.0085, 0.046, M.metal, x, y - 0.002, z, 12);
      for (const k of [-1, 0, 1]) zt(0.009, 0.0016, k ? M.accent : M.led, x, y - 0.002, z + k * 0.014);
      zc(0.0055, 0.002, M.led, x, y - 0.002, z + 0.0235, 12);
      if (hi(p)) for (const s of [-1, 1]) zc(0.0025, 0.036, M.dark, x + s * 0.011, y + 0.002, z, 6);
      if (max(p)) zt(0.0105, 0.0011, M.led, x, y - 0.002, z - 0.02);
    } else if (p.v === "cap") {
      // 축전기 뱅크: 누운 원통 셋
      for (const k of [-1, 0, 1]) { zc(0.0055, 0.04, M.metal, x + k * 0.0115, y, z, 10); if (hi(p)) zc(0.0045, 0.002, M.led, x + k * 0.0115, y, z + 0.021, 10); }
      add(box(0.036, 0.003, 0.008), M.accent, x, y + 0.005, z);
      if (max(p)) for (const k of [-1, 0, 1]) zt(0.0058, 0.0011, M.led, x + k * 0.0115, y, z - 0.008);
    } else {
      add(box(0.024, 0.012, 0.05), M.dark, x, y, z);
      add(box(0.026, 0.013, 0.006), M.accent, x, y, z);
      if (hi(p)) add(box(0.01, 0.003, 0.002), M.led, x, y, z + 0.026);
      if (max(p)) for (const k of [-1, 1]) add(box(0.026, 0.013, 0.003), M.accent, x, y, z + k * 0.017);
    }
  }

  // ── 센서·조준: 돛대 ──
  {
    const p = P("sensor"), [x, y, z] = A.sensor;
    if (p.v === "scope") {
      // 정밀 조준경: 앞을 보는 통 + 렌즈
      add(cyl(0.002, 0.012, 6), M.dark, x, y + 0.006, z);
      zc(0.0052, 0.034, M.dark, x, y + 0.016, z - 0.004, 10);
      zc(0.0056, 0.003, M.accent, x, y + 0.016, z - 0.021, 10);
      zc(0.0042, 0.001, max(p) ? M.led : M.metal, x, y + 0.016, z - 0.0228, 10);
      if (hi(p)) zc(0.0022, 0.022, M.metal, x, y + 0.0235, z - 0.006, 6);
    } else if (p.v === "ew") {
      // 전자전 재머: 짧은 받침 상자 위 채찍 안테나 여럿
      add(box(0.012, 0.008, 0.02), M.dark, x, y + 0.004, z);
      const n = hi(p) ? 4 : 3;
      for (let k = 0; k < n; k++) { const a = add(cyl(0.0007, 0.03 + (k % 2) * 0.012, 4), M.dark, x, y + 0.02 + (k % 2) * 0.006, z - 0.008 + k * (0.016 / (n - 1))); a.rotation.z = (k - (n - 1) / 2) * 0.25; add(sph(0.0018), max(p) ? M.led : M.accent, x - Math.sin(a.rotation.z) * (0.015 + (k % 2) * 0.006), y + 0.035 + (k % 2) * 0.012, a.position.z); }
      ft(0.006, 0.0011, M.accent, x, y + 0.009, z);
    } else if (p.v === "radar") {
      // 광역 레이더: 돛대 위에서 도는 접시
      add(cyl(0.0018, 0.03, 6), M.dark, x, y + 0.015, z);
      const dish = add(cyl(0.016, 0.0025, 14, 0.011), M.accent, x, y + 0.032, z); dish.rotation.z = 0.35;
      const hold = new THREE.Group(); hold.position.copy(dish.position); dish.parent.add(hold); hold.add(dish); dish.position.set(0, 0, 0);
      if (max(p)) { const rim = new THREE.Mesh(tor(0.016, 0.0011), M.led); rim.rotation.x = Math.PI / 2; rim.position.y = 0.0015; dish.add(rim); }
      ticks.push((dt) => { hold.rotation.y += dt * 2.4; });
      if (hi(p)) { add(cyl(0.0008, 0.03, 4), M.dark, x, y + 0.014, z + 0.012); add(sph(0.003), M.accent, x, y + 0.03, z + 0.012); }
    } else {
      add(cyl(0.0015, 0.018, 5), M.dark, x, y + 0.009, z);
      add(sph(0.0052), M.dark, x, y + 0.02, z);
      if (hi(p)) ft(0.0055, 0.0012, M.accent, x, y + 0.019, z);
      if (max(p)) add(sph(0.0024), M.led, x, y + 0.0255, z);
    }
  }

  // ── 실드 발생기: 좌우 대칭 ──
  {
    const p = P("shield"), [px, y, z] = A.shield;
    for (const s of [-1, 1]) {
      const x = s * px;
      if (p.v === "tac") {
        // 반응형 방벽: 바깥으로 뻗은 가시 둘 + 육각 판
        for (const k of [-1, 1]) { const c = add(cyl(0.0005, 0.02, 6, 0.0038), M.metal, x + s * 0.008, y, z + k * 0.014); c.rotation.z = -s * Math.PI / 2; if (max(p)) add(sph(0.0026), M.led, x + s * 0.019, y, z + k * 0.014); }
        add(box(0.006, 0.008, 0.042), M.accent, x, y, z);
        if (hi(p)) { const h = add(cyl(0.009, 0.002, 6), M.accent, x + s * 0.004, y, z); h.rotation.z = Math.PI / 2; }
      } else if (p.v === "cap") {
        // 흡수 실드 코어: 받침 위 구형 코어 + 둘레를 도는 고리
        add(box(0.008, 0.004, 0.014), M.dark, x, y - 0.002, z);
        const core = add(sph(0.0058), M.accent, x + s * 0.002, y + 0.006, z);
        const hold = new THREE.Group(); hold.position.copy(core.position); core.parent.add(hold);
        const ring = new THREE.Mesh(tor(0.0085, 0.0011, 16), hi(p) ? M.led : M.metal); ring.rotation.x = Math.PI / 2 - 0.5; hold.add(ring);
        if (max(p)) { const r2 = new THREE.Mesh(tor(0.0085, 0.0011, 16), M.led); r2.rotation.x = Math.PI / 2 + 0.5; hold.add(r2); }
        ticks.push((dt) => { hold.rotation.y += dt * 3 * s; });
      } else if (p.v === "nano") {
        // 나노 수리기: 작은 통 + 뚜껑 빛
        zc(0.0052, 0.026, M.metal, x, y, z, 10);
        zc(0.0056, 0.004, M.accent, x, y, z - 0.012, 10);
        zc(0.004, 0.0015, M.led, x, y, z + 0.0138, 10);
        if (hi(p)) zc(0.004, 0.02, M.metal, x, y + 0.0085, z + 0.002, 8);
        if (max(p)) zt(0.0056, 0.0012, M.led, x, y, z);
      } else {
        // 표준 발생기: 작은 날개판 + 끝 빛
        const f = add(box(0.014, 0.003, 0.02), M.accent, x + s * 0.005, y, z); f.rotation.z = s * 0.25;
        add(sph(0.003), M.led, x + s * 0.012, y + 0.002, z);
        if (hi(p)) { const f2 = add(box(0.01, 0.003, 0.012), M.accent, x + s * 0.004, y, z - 0.024); f2.rotation.z = s * 0.25; }
        if (max(p)) { const t = add(tor(0.0055, 0.001, 12), M.led, x + s * 0.012, y + 0.002, z); t.rotation.y = Math.PI / 2; }
      }
    }
  }

  // ── 냉각기: 뒤쪽 윗면 좌우 ──
  {
    const p = P("cooler"), [px, y, z] = A.cooler;
    for (const s of [-1, 1]) {
      const x = s * px;
      if (p.v === "cryo") {
        // 극저온: 냉매 탱크
        zc(0.006, 0.034, M.metal, x, y + 0.006, z, 10);
        for (const k of [-1, 1]) zt(0.0062, 0.0013, M.accent, x, y + 0.006, z + k * 0.012);
        if (hi(p)) add(box(0.002, 0.002, 0.04), M.accent, x - s * 0.006, y + 0.002, z - 0.012);
        if (max(p)) zc(0.0045, 0.0015, M.led, x, y + 0.006, z + 0.0178, 10);
      } else if (p.v === "liquid") {
        // 수랭 순환기: 얇은 라디에이터 + 앞으로 이어진 냉각관
        add(box(0.012, 0.012, 0.02), M.dark, x, y + 0.006, z);
        for (let k = 0; k < 4; k++) add(box(0.0125, 0.0012, 0.019), M.metal, x, y + 0.001 + k * 0.0032, z);
        const pipe = add(cyl(0.0014, 0.04, 6), M.accent, x - s * 0.004, y + 0.003, z - 0.03); pipe.rotation.x = Math.PI / 2;
        if (hi(p)) { const p2 = add(cyl(0.0014, 0.04, 6), M.accent, x + s * 0.003, y + 0.003, z - 0.03); p2.rotation.x = Math.PI / 2; }
        if (max(p)) add(box(0.0128, 0.002, 0.004), M.led, x, y + 0.013, z + 0.008);
      } else if (p.v === "vent") {
        // 터보 벤트: 뒤로 기운 배기구
        const v = add(box(0.011, 0.009, 0.026), M.dark, x, y + 0.005, z); v.rotation.x = -0.3;
        const lip = add(box(0.013, 0.011, 0.003), M.accent, x, y + 0.0015, z + 0.0125); lip.rotation.x = -0.3;
        if (hi(p)) { const n = zc(0.0058, 0.012, M.metal, x, y + 0.0005, z + 0.019, 10, 0.0045, true); n.rotation.x = Math.PI / 2 - 0.3; n.material = M.darkIn || M.metal; }
        if (max(p)) { const gl = add(box(0.008, 0.006, 0.001), M.led, x, y + 0.001, z + 0.0142); gl.rotation.x = -0.3; }
      } else {
        // 방열판: 얇은 핀
        const n = hi(p) ? 3 : 2;
        for (let i = 0; i < n; i++) add(box(0.0016, 0.012, 0.022), M.metal, x + (i - (n - 1) / 2) * 0.0045, y + 0.006, z);
        if (max(p)) add(box(0.014, 0.002, 0.022), M.led, x, y + 0.0008, z);
      }
    }
  }
  return ticks;
}
