// 빛 바다의 하늘과 원경: 어미별 하늘(가스 행성·두 위성·오로라)은 에일 하늘을 그대로 쓰고,
// 수평선엔 먼 바다 기둥 바위와 가라앉은 도시의 첨탑 실루엣, 빛나는 먼 환초, 하늘 높이 떠가는 거대 가오리 무리를 둔다
import * as THREE from "../../vendor/three.module.min.js";
import { sky as ailSky, GIANT } from "./ail-sky.js";
import { M, conchG, lumpG, capG, AQUA, BLUE2, ROSE, INDIGO, INDIGO2, DEEP } from "./ailsea-kit.js";

export { GIANT };

export function sky(w) {
  ailSky(w);
  const r = w.rand, parts = [], glow = [];
  const rock = new THREE.CylinderGeometry(0.22, 1, 1, 9, 6); rock.translate(0, 0.5, 0);
  {
    const P = rock.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = (1 + Math.sin(v.y * 9 + Math.atan2(v.z, v.x) * 3) * 0.16) * (1 - 0.25 * Math.sin(v.y * 3.1)); P.setXYZ(i, v.x * k + Math.sin(v.y * 2.2) * 0.25 * v.y, v.y, v.z * k); }
    rock.computeVertexNormals();
  }
  w.disposables.push(rock);
  // ── 바다 기둥 바위(맵 둘레 360~900 m): 꼭대기에 빛 이끼, 일부는 소라 첨탑을 얹었다 ──
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + r() * 0.12, d = 430 + r() * 560, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 10 + r() * 24, H = s * (2.2 + r() * 3.2);
    parts.push([rock, M(x, -6, z, s, H, s, 0, r() * 360, 0), r() < 0.5 ? 0x2a2a6a : 0x34307a]);
    glow.push([lumpG(), M(x, -6 + H * (0.35 + r() * 0.4), z, s * 0.75, s * 0.12, s * 0.75, 0, r() * 360, 0), r() < 0.6 ? 0x2ad8c8 : 0x6a7aff]);
    if (r() < 0.45) parts.push([conchG(), M(x, -6 + H, z, s * 0.22, s * (1.4 + r()), s * 0.22, (r() - 0.5) * 14, r() * 360, 0), 0xb8c8ea]);
    // 기둥 밑의 물보라 빛 고리
    glow.push([lumpG(), M(x, -0.3, z, s * 1.3, 0.4, s * 1.3, 0, r() * 360, 0), 0x1a8a9a]);
  }
  // ── 먼 환초 도시: 수평선 위로 솟은 소라 탑 무리(북서·동·남서) ──
  for (const [a0, d] of [[-2.3, 1100], [0.25, 1250], [2.25, 1000], [-1.1, 1400]]) {
    for (let k = 0; k < 9; k++) {
      const a = a0 + (r() - 0.5) * 0.16, dd = d + (r() - 0.5) * 160, x = Math.cos(a) * dd, z = Math.sin(a) * dd, H = 60 + r() * 150, R = 7 + r() * 12;
      parts.push([conchG(), M(x, -4, z, R, H, R, (r() - 0.5) * 10, r() * 360, 0), k % 3 ? 0x3a4290 : 0x5a62b0]);
      glow.push([lumpG(), M(x, -4 + H * 0.98, z, R * 0.3, R * 0.5, R * 0.3), k % 2 ? 0xff6ab8 : 0x6affee]);
    }
    const x = Math.cos(a0) * d, z = Math.sin(a0) * d;
    glow.push([lumpG(), M(x, -0.2, z, 220, 0.6, 140, 0, (a0 * 57) % 360, 0), 0x137080]);
  }
  for (const [g, m, c] of parts) w.mesh(g, m, c, "flat");
  for (const [g, m, c] of glow) w.mesh(g, m, c, "glow");
  // ── 하늘 높이 떠가는 거대 가오리 무리(먼 실루엣, 날개를 천천히 친다) ──
  const rayG = new THREE.PlaneGeometry(2, 1.4, 8, 4);
  {
    const P = rayG.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); const k = Math.abs(v.x); P.setXYZ(i, v.x * (1 - Math.abs(v.y) * 0.4), -k * k * 0.12, v.y * (1 - k * 0.42) + (k * 0.2)); }
    rayG.computeVertexNormals();
  }
  const rm = new THREE.MeshBasicMaterial({ color: 0x1c1a48, side: THREE.DoubleSide, fog: true });
  const big = [];
  for (let i = 0; i < 7; i++) {
    const o = new THREE.Mesh(rayG, rm), s = 26 + r() * 22;
    o.scale.set(s, s, s); o.frustumCulled = false; o.renderOrder = -2;
    w.scene.add(o);
    big.push({ o, a: r() * 6.28, R: 600 + r() * 500, y: 180 + r() * 160, sp: (0.006 + r() * 0.004) * (i % 2 ? 1 : -1), ph: r() * 6 });
  }
  w.disposables.push(rayG, rm);
  w.updaters.push((dt, t) => {
    for (const b of big) {
      const a = b.a + t * b.sp, x = Math.cos(a) * b.R, z = Math.sin(a) * b.R;
      b.o.position.set(x, b.y + Math.sin(t * 0.2 + b.ph) * 10, z);
      b.o.rotation.set(0, Math.atan2(Math.sin(a) * Math.sign(b.sp), -Math.cos(a) * Math.sign(b.sp)), Math.sin(t * 0.5 + b.ph) * 0.12);
      b.o.scale.y = b.o.scale.x * (1 + Math.sin(t * 0.9 + b.ph) * 0.35);
    }
  });
  void AQUA; void BLUE2; void ROSE; void INDIGO; void INDIGO2; void DEEP;
}
