// 포자 숲 하늘·원경: 어미별 하늘(가스 행성·두 위성·오로라)은 에일 맵의 것을 그대로 쓰고,
// 맵 둘레(235~520 m)에 겹겹이 선 먼 거대 버섯 실루엣과 숲 언덕으로 지평선을 막는다
import * as THREE from "../../vendor/three.module.min.js";
import { M, capG, lumpG } from "./ail-kit.js";
import { sky } from "./ail-sky.js";
import { height } from "./ailwood-terrain.js";

export function skyAndFar(w) {
  sky(w);
  const r = w.rand, stem = new THREE.CylinderGeometry(0.75, 1, 1, 7, 1, true); stem.translate(0, 0.5, 0);
  const CAPC = [0x4a2c8a, 0x1e5a6a, 0x5a2a7a, 0x2a3a8a], GL = [0x3ff0d8, 0x9cff6a, 0xff5ed8, 0xc77dff];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + r() * 0.08, d = 300 + r() * 260, x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.max(Math.abs(x), Math.abs(z)) < 250) continue;
    const H = 50 + r() * 110 + (d - 270) * 0.25, R = H * (0.22 + r() * 0.12), gy = height(x, z), k = i % 4;
    w.mesh(stem, M(x, gy - 2, z, H * 0.05, H, H * 0.05), 0x8a7aa8, "flat");
    w.mesh(capG(), M(x, gy + H, z, R, R * 0.8, R, 0, r() * 360, 0), CAPC[k], "flat");
    w.mesh(capG(), M(x, gy + H - R * 0.05, z, R * 0.88, R * 0.2, R * 0.88, 180, 0, 0), GL[k], "glow");
  }
  // 낮은 숲 덤불 띠(먼 둔덕 위)
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2, d = 250 + r() * 170, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 8 + r() * 16;
    if (Math.max(Math.abs(x), Math.abs(z)) < 252 + s) continue;
    w.mesh(lumpG(), M(x, height(x, z) + s * 0.3, z, s * 1.4, s * 0.7, s * 1.4, 0, r() * 360, 0), r() < 0.5 ? 0x1e4a48 : 0x2a2a5a, "flat");
  }
}
