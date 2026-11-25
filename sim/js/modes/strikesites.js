// 돌파 작전 구역 시설: 구역마다 생김새가 다른 적 시설을 세워 장소를 또렷하게 구분한다
//  레이더 기지 · 연료 저장소 · 방공 진지 · 무기고 · 통신 중계소 · 지휘 벙커 · 채굴 시설 · 조선 도크, 최종은 적 본진 요새
//  같은 재질끼리 합쳐(mergeStatic) 그리기 호출을 줄이고, 큰 덩어리에는 충돌 상자를 단다
import * as THREE from "../../vendor/three.module.min.js";
import { mergeStatic } from "../mergemodel.js";

const V3 = THREE.Vector3;
export const SITE_NAMES = { radar: "레이더 기지", fuel: "연료 저장소", flak: "방공 진지", armory: "무기고", relay: "통신 중계소", bunker: "지휘 벙커", mine: "채굴 시설", dock: "조선 도크", power: "발전소", fort: "적 본진 요새" };
export const SITE_KEYS = ["radar", "fuel", "flak", "armory", "relay", "bunker", "mine", "dock", "power"];   // 구역 9곳이 모두 다르게

let MATS = null;
const mats = () => MATS || (MATS = {
  wall: new THREE.MeshLambertMaterial({ color: 0x4a515c }), dark: new THREE.MeshLambertMaterial({ color: 0x2a2f38 }),
  olive: new THREE.MeshLambertMaterial({ color: 0x55603f }), rust: new THREE.MeshLambertMaterial({ color: 0x7a4a32 }),
  steel: new THREE.MeshLambertMaterial({ color: 0x8a93a3 }), sand: new THREE.MeshLambertMaterial({ color: 0x9a8a62 }),
  red: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2a3a).multiplyScalar(1.8) }), glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffa040).multiplyScalar(1.6) }),
  hz: new THREE.MeshLambertMaterial({ color: 0xd9a21c }),
});
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 16), SPH = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), TOR = new THREE.TorusGeometry(1, 0.28, 6, 20);

// w: world, p: 지면 중심, key: 시설 종류, rot: 회전(라디안). 반환: 정리 함수
export function buildSite(w, p, key, rot = 0) {
  const M = mats(), g = new THREE.Group(), cols = [];
  g.position.copy(p); g.rotation.y = rot;
  const q = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), rot);
  const add = (geo, mat, x, y, z, sx, sy, sz, col = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (col) { const c = new V3(x, y, z).applyQuaternion(q).add(p); const h = geo === BOX ? new V3(sx / 2, sy / 2, sz / 2) : new V3(sx * 0.85, sy / 2, sz * 0.85); cols.push(w.col.addBox(c, h, q)); }
    return m;
  };
  const B = (mat, x, y, z, sx, sy, sz, col) => add(BOX, mat, x, y + sy / 2, z, sx, sy, sz, col);
  const C = (mat, x, y, z, r, h, col) => add(CYL, mat, x, y + h / 2, z, r, h, r, col);
  const lamp = (x, y, z) => add(SPH, M.red, x, y, z, 0.8, 0.8, 0.8, false);
  if (key === "radar") {
    B(M.wall, 0, 0, 0, 22, 1.2, 22); C(M.steel, 0, 1.2, 0, 1.4, 22); add(SPH, M.steel, 0, 23.2, 0, 7, 3, 7, false); lamp(0, 26.5, 0);
    B(M.olive, -12, 0, 8, 7, 4, 5); B(M.olive, 12, 0, -8, 6, 3.5, 6); for (let i = 0; i < 4; i++) C(M.dark, -16 + i * 3, 0, -12, 0.25, 6, false);
  } else if (key === "fuel") {
    for (let i = 0; i < 4; i++) { const x = (i % 2 ? 1 : -1) * 9, z = (i < 2 ? -1 : 1) * 9; C(M.steel, x, 0, z, 5.5, 9); add(SPH, M.steel, x, 9, z, 5.5, 2, 5.5, false); add(BOX, M.hz, x, 4.5, z + 5.6, 4, 0.6, 0.2, false); }
    B(M.dark, 0, 2, 0, 18, 0.8, 0.8, false); B(M.dark, 0, 2, 0, 0.8, 0.8, 18, false); B(M.wall, 0, 0, 0, 30, 0.6, 30, false); lamp(0, 12, 0);
  } else if (key === "flak") {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2, x = Math.cos(a) * 12, z = Math.sin(a) * 12;
      const r = add(TOR, M.sand, x, 0.9, z, 5, 5, 3.4, false); r.rotation.x = Math.PI / 2;
      C(M.dark, x, 0, z, 1.4, 2.2); const br = add(BOX, M.dark, x, 3.6, z, 0.4, 0.4, 6, false); br.rotation.x = -0.8;
      B(M.olive, x + 3, 0, z + 2, 1.4, 1, 1, false);
    }
    B(M.olive, 0, 0, 0, 6, 3, 6); lamp(0, 4, 0);
  } else if (key === "armory") {
    for (const s of [-1, 1]) { const h = add(CYL, M.olive, s * 9, 0, 0, 6, 18, 6, false); h.rotation.x = Math.PI / 2; cols.push(w.col.addBox(new V3(s * 9, 3, 0).applyQuaternion(q).add(p), new V3(6, 3, 9), q)); B(M.dark, s * 9, 0, 9.2, 8, 5, 0.4, false); }
    B(M.wall, 0, 0, -16, 26, 3, 3); for (let i = 0; i < 6; i++) B(M.rust, -10 + i * 4, 0, 14, 2.2, 2, 2.2, false); lamp(0, 7, 0);
  } else if (key === "relay") {
    for (const s of [-1, 1]) { const x = s * 8; for (const dx of [-1.6, 1.6]) for (const dz of [-1.6, 1.6]) B(M.dark, x + dx, 0, dz, 0.3, 30, 0.3, false); for (let k = 1; k < 6; k++) B(M.dark, x, k * 5, 0, 3.6, 0.25, 3.6, false); cols.push(w.col.addBox(new V3(x, 15, 0).applyQuaternion(q).add(p), new V3(1.8, 15, 1.8), q)); lamp(x, 31, 0); }
    B(M.olive, 0, 0, 10, 8, 3.5, 5); add(SPH, M.steel, 0, 3.5, 10, 2.5, 2, 2.5, false);
  } else if (key === "bunker") {
    B(M.wall, 0, 0, 0, 24, 6, 16); B(M.dark, 0, 3.2, 8.05, 18, 0.8, 0.2, false); B(M.wall, 0, 6, 0, 10, 2.5, 8);
    for (const s of [-1, 1]) B(M.sand, s * 16, 0, 0, 3, 2.2, 20); C(M.steel, 9, 6, -5, 0.15, 10, false); B(M.red, 10.2, 13.5, -5, 2.4, 1.4, 0.1, false); lamp(0, 9, 0);
  } else if (key === "mine") {
    for (let i = 0; i < 3; i++) C(M.rust, -10 + i * 7, 0, -8, 3, 14); for (let i = 0; i < 5; i++) C(M.dark, -6 + i * 6, 0, 6, 0.5, 6, false);
    B(M.steel, 6, 6, 6, 30, 1.2, 2.4, false); cols.push(w.col.addBox(new V3(6, 6.6, 6).applyQuaternion(q).add(p), new V3(15, 0.6, 1.2), q));
    add(SPH, M.sand, 14, 0, -6, 6, 4, 6, false); add(SPH, M.sand, -14, 0, 10, 5, 3, 5, false); lamp(-10, 15, -8);
  } else if (key === "dock") {
    B(M.wall, 0, 0, 0, 34, 1.5, 18); for (const s of [-1, 1]) B(M.dark, s * 15, 1.5, 0, 1.5, 16, 1.5); B(M.hz, 0, 17.5, 0, 32, 1.4, 2);
    const hull = add(BOX, M.rust, 0, 4, 0, 22, 4, 7, false); hull.position.y = 3.5; B(M.dark, -4, 5.5, 0, 6, 3, 4, false); lamp(15, 18.5, 0); lamp(-15, 18.5, 0);
  } else if (key === "power") {
    for (const s of [-1, 1]) { C(M.wall, s * 10, 0, -4, 7, 18); add(TOR, M.dark, s * 10, 18, -4, 7, 7, 4, false).rotation.x = Math.PI / 2; }
    for (let i = 0; i < 3; i++) { B(M.steel, -8 + i * 8, 0, 12, 4, 4, 3); B(M.glow, -8 + i * 8, 4, 12, 0.6, 0.6, 3.2, false); }
    for (let i = 0; i < 3; i++) C(M.dark, -12 + i * 12, 0, 20, 0.3, 14, false); B(M.dark, 0, 13, 20, 26, 0.2, 0.2, false); lamp(10, 19, -4); lamp(-10, 19, -4);
  } else if (key === "fort") {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 34, z = Math.sin(a) * 34; if (i === 2) continue; const wl = add(BOX, M.wall, x, 5, z, 24, 10, 3); wl.rotation.y = -a + Math.PI / 2; cols.push(w.col.addBox(new V3(x, 5, z).applyQuaternion(q).add(p), new V3(12, 5, 1.5), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), rot - a + Math.PI / 2))); }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.39, x = Math.cos(a) * 36, z = Math.sin(a) * 36; C(M.dark, x, 0, z, 4, 18); lamp(x, 19, z); }
    B(M.dark, 0, 0, 0, 14, 12, 14); B(M.wall, 0, 12, 0, 8, 8, 8); lamp(0, 21, 0);
  }
  g.userData.anim = [];
  mergeStatic(g);
  w.scene.add(g);
  return () => { w.scene.remove(g); for (const c of cols) if (c && w.col.remove) w.col.remove(c); };
}
