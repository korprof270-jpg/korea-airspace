// 설국 산장 제작 도구: 박공지붕·산장·눈 덮인 소나무·전구 줄·얼음 기둥·눈사람·눈발
import * as THREE from "../../vendor/three.module.min.js";
import { M, beam, frame } from "./canyon-kit.js";

const DEG = Math.PI / 180;
export const SNOW = 0xf2f6fb, SNOW_SH = 0xd9e6f5, ICE = 0xa9dcf2, ICE_D = 0x6fb9e2, STONE = 0x9aa0ab, STONE_D = 0x7b828f, TIMBER = 0x8a5a34, TIMBER_D = 0x5a3a22, WARM = 0xffc070;
const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l).getHex();

// 삼각기둥: 밑변 x∈[-1,1], 높이 y∈[0,1], 길이 z∈[-0.5,0.5]
export const PRISM = (() => {
  const A = [-1, 0], B = [1, 0], C = [0, 1], p = (q, z) => [q[0], q[1], z], tri = [];
  tri.push(p(A, 0.5), p(B, 0.5), p(C, 0.5), p(B, -0.5), p(A, -0.5), p(C, -0.5));
  tri.push(p(B, 0.5), p(B, -0.5), p(C, -0.5), p(B, 0.5), p(C, -0.5), p(C, 0.5));
  tri.push(p(A, -0.5), p(A, 0.5), p(C, 0.5), p(A, -0.5), p(C, 0.5), p(C, -0.5));
  tri.push(p(A, 0.5), p(A, -0.5), p(B, -0.5), p(A, 0.5), p(B, -0.5), p(B, 0.5));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(tri.flat(), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(tri.flatMap((v) => [v[0] + v[2], v[1]]), 2));
  g.computeVertexNormals(); g.computeBoundingBox();
  return g;
})();
// 네모뿔(첨탑), 팔각뿔, 반구, 반 토러스
export const PYR = (() => { const g = new THREE.ConeGeometry(1, 1, 4, 1, false); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.computeBoundingBox(); return g; })();
export const DOME = (() => { const g = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); g.computeBoundingBox(); return g; })();
export const HALFTORUS = (() => { const g = new THREE.TorusGeometry(1, 0.09, 6, 16, Math.PI); g.computeBoundingBox(); return g; })();
export const BALL = (() => { const g = new THREE.SphereGeometry(1, 16, 10); g.computeBoundingBox(); return g; })();

// 회전 좌표계(frame) 안에 임의 지오메트리를 놓는다
export function place(w, F, geo, u, y, v, sx, sy, sz, color, mat = "std", ry = 0, rx = 0, rz = 0) {
  w.mesh(geo, M(F.X(u, v), F.y0 + y, F.Z(u, v), sx, sy, sz, rx, F.ry + ry, rz), color, mat);
}

// 박공지붕: 용마루가 v 축. y = 벽 꼭대기, hw = 벽 절반 폭, depth = 길이. 눈 덮인 경사판 두 장 + 박공 삼각형
export function roof(w, F, y, hw, depth, pitch = 32, o = {}) {
  const ov = o.ov ?? 0.8, ovz = o.ovz ?? 0.7, tan = Math.tan(pitch * DEG), cos = Math.cos(pitch * DEG), hs = hw + ov, rh = hw * tan, th = o.th ?? 0.5, du = o.u || 0, dv = o.v || 0;
  place(w, F, PRISM, du, y, dv, hw, rh, depth, o.gable ?? TIMBER, o.gmat || "std:wood");
  for (const s of [-1, 1]) {
    const yc = y + rh - (hs * tan) / 2;
    F.box(du + (s * hs) / 2, yc + 0.16, dv, hs / cos + 0.1, th, depth + ovz * 2, o.snow ?? SNOW, { rz: -s * pitch, mat: "std", ao: false, col: o.col !== false });
    F.box(du + (s * hs) / 2, yc + 0.02, dv, hs / cos, 0.16, depth + ovz * 2 - 0.2, o.eave ?? TIMBER_D, { rz: -s * pitch, col: false, ao: false });
  }
  F.box(du, y + rh + 0.3, dv, 0.9, 0.4, depth + ovz * 2, o.snow ?? SNOW, { col: false, ao: false });
  return y + rh + 0.7;
}

// 따뜻한 불빛 창: 벽면(법선 방향 nu,nv)에 붙인다
export function win(F, u, y, v, wd, ht, side, o = {}) {
  // side: 0 = -v 면(앞), 1 = +v 면(뒤), 2 = -u 면, 3 = +u 면
  const alongU = side < 2, sx = alongU ? wd : 0.1, sz = alongU ? 0.1 : wd, k = side % 2 ? 1 : -1;
  const ou = alongU ? 0 : k * 0.04, ov = alongU ? k * 0.04 : 0;
  F.box(u + ou, y, v + ov, sx, ht, sz, o.color ?? WARM, { mat: "glow", col: false });
  F.box(u + ou * 2.5, y - 0.14, v + ov * 2.5, alongU ? wd + 0.3 : 0.26, 0.14, alongU ? 0.26 : wd + 0.3, SNOW, { col: false, ao: false });
  if (o.shutter) for (const s of [-1, 1]) F.box(u + (alongU ? s * (wd / 2 + 0.22) : ou), y, v + (alongU ? ov : s * (wd / 2 + 0.22)), alongU ? 0.36 : 0.08, ht, alongU ? 0.08 : 0.36, o.shutter, { col: false, ao: false });
}

// 목조 산장: 돌 기단 + 통나무 벽 + 눈 덮인 박공지붕 + 발코니·굴뚝·창. 앞면은 -v
export function chalet(w, x, z, ry = 0, o = {}) {
  const sx = o.sx ?? 9, sz = o.sz ?? 8, floors = o.floors ?? 2, wood = o.wood ?? TIMBER, accent = o.accent ?? 0x3d7a4f, y0 = o.y ?? w.h(x, z), F = frame(w, x, z, ry, y0);
  const hw = 1.2 + floors * 2.7;
  F.box(0, -1.6, 0, sx + 0.4, 2.8, sz + 0.4, STONE, { mat: "std:brick", tile: 3 });
  F.box(0, 1.2, 0, sx, hw - 1.2, sz, wood, { mat: "std:wood", tile: 2.4 });
  for (let f = 0; f < floors; f++) {
    const wy = 1.9 + f * 2.7, nu = Math.max(2, Math.round(sx / 3.2));
    for (let i = 0; i < nu; i++) {
      const u = (i - (nu - 1) / 2) * (sx / nu);
      if (!(f === 0 && i === ((nu - 1) >> 1))) win(F, u, wy, -sz / 2, 1.1, 1.2, 0, { shutter: accent });
      win(F, u, wy, sz / 2, 1.1, 1.2, 1, { shutter: accent });
    }
    for (const s of [2, 3]) win(F, s === 2 ? -sx / 2 : sx / 2, wy, 0, 1.2, 1.2, s);
  }
  // 현관문과 발코니
  const du = (((Math.max(2, Math.round(sx / 3.2)) - 1) >> 1) - (Math.max(2, Math.round(sx / 3.2)) - 1) / 2) * (sx / Math.max(2, Math.round(sx / 3.2)));
  F.box(du, 1.2, -sz / 2 - 0.06, 1.2, 2.1, 0.12, accent, { col: false, mat: "paint" });
  F.box(du, 0.95, -sz / 2 - 0.8, 2.2, 0.25, 1.4, STONE_D, { col: false });
  if (floors >= 2) {
    F.box(0, 3.75, -sz / 2 - 0.7, sx * 0.94, 0.16, 1.4, TIMBER_D, { col: false, mat: "std:wood", tile: 2 });
    F.box(0, 3.9, -sz / 2 - 1.36, sx * 0.94, 0.85, 0.1, TIMBER_D, { col: false, mat: "std:wood", tile: 2 });
    F.box(0, 4.75, -sz / 2 - 1.36, sx * 0.94 + 0.1, 0.14, 0.24, SNOW, { col: false, ao: false });
  }
  const top = roof(w, F, hw, sx / 2, sz, o.pitch ?? 32, { gable: wood });
  // 굴뚝
  const cu = sx * 0.24, cv = sz * 0.18;
  F.box(cu, hw, cv, 0.9, top - hw + 0.5, 0.9, 0x8d4a3a, { mat: "std:brick", tile: 2 });
  F.box(cu, top + 0.5, cv, 1.15, 0.22, 1.15, SNOW, { col: false, ao: false });
  return { F, top, hw };
}

// 부채꼴 원뿔(삼각형 7개): 밑면 y = 0 반경 1, 꼭짓점 y = 1. 숲을 싸게 그리려고 쓴다
export const FAN = (() => {
  const n = 7, pos = [], nor = [], uv = [], k = Math.SQRT1_2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    pos.push(Math.cos(a1), 0, Math.sin(a1), Math.cos(a0), 0, Math.sin(a0), 0, 1, 0);
    nor.push(Math.cos(a1) * k, k, Math.sin(a1) * k, Math.cos(a0) * k, k, Math.sin(a0) * k, Math.cos(am) * k, k, Math.sin(am) * k);
    uv.push(1, 0, 0, 0, 0.5, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeBoundingBox();
  return g;
})();

// 눈 덮인 소나무: 세 단 원뿔 + 단마다 흰 눈 모자
export function snowPine(w, T, x, z, s = 1, cap = SNOW) {
  const r = w.rand, y = w.h(x, z) - 0.3, h = (9 + r() * 7) * s, g = hsl(0.4 + r() * 0.05, 0.42, 0.16 + r() * 0.05);
  const e = new THREE.Euler(), q = new THREE.Quaternion(), m = new THREE.Matrix4(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const mm = (yy, rr, hh, rot) => m.compose(p.set(x, yy, z), q.setFromEuler(e.set(0, rot, 0)), sc.set(rr, hh, rr));
  w.mesh(T.trunk, mm(y, 0.32 * s, h * 0.5, 0), 0x4f3826, "std");
  for (let i = 0; i < 3; i++) {
    const t = i / 2, rr = (2.9 - t * 1.9) * s * (0.9 + r() * 0.2), hh = h * (0.44 - t * 0.07), yy = y + h * (0.16 + t * 0.27), rot = r() * 6;
    w.mesh(FAN, mm(yy, rr, hh, rot), g, "foliage");
    w.mesh(FAN, mm(yy + hh * 0.4, rr * 0.68, hh * 0.62, rot + 0.45), cap, "foliage");
  }
  w.col.addCapsule(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + h * 0.88, z), 0.75 * s);
}

// 처진 전구 줄 a → b (충돌 없음)
export function garland(w, a, b, sag = 1.2, n = 9, colors = [0xff5a4a, 0xffd23a, 0x4ad0ff, 0x6aff8a]) {
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    beam(w, prev, p, 0.05, 0x2a2f38, { col: false });
    if (i < n) w.box(p[0], p[1] - 0.3, p[2], 0.28, 0.28, 0.28, colors[i % colors.length], { mat: "glow", col: false });
    prev = p;
  }
}

// 얼음 기둥(위에서 아래로 가늘어진다) + 끝의 고드름
export function iceColumn(w, T, x, yTop, z, r, len, color = ICE, col = true) {
  w.mesh(T.col8, M(x, yTop - len, z, r * 0.72, len, r * 0.72, 0, w.rand() * 360, 0), color, "paint");
  w.mesh(T.col8, M(x, yTop - len * 0.45, z, r, len * 0.45, r, 0, w.rand() * 360, 0), color, "paint");
  if (col) w.col.addCapsule(new THREE.Vector3(x, yTop - len + r, z), new THREE.Vector3(x, yTop, z), r * 0.85);
}
export function icicle(w, T, x, yTop, z, r, len, color = ICE) {
  w.mesh(T.coneO, M(x, yTop, z, r, len, r, 180, 0, 0), color, "paint");
}

// 눈사람(높이 약 11m × s)
export function snowman(w, x, z, s = 1, ry = 0) {
  const y = w.h(x, z), F = frame(w, x, z, ry, y);
  for (const [yy, r] of [[3 * s, 3.4 * s], [7.3 * s, 2.5 * s], [10.4 * s, 1.7 * s]]) { w.mesh(BALL, M(x, y + yy, z, r, r * 0.94, r), SNOW, "std"); w.col.addSphere(new THREE.Vector3(x, y + yy, z), r * 0.95); }
  F.cyl(0, 11.6 * s, 0, 1.9 * s, 0.18 * s, 0x23262e, { col: false }); F.cyl(0, 11.7 * s, 0, 1.2 * s, 1.7 * s, 0x23262e, {}); F.cyl(0, 11.95 * s, 0, 1.24 * s, 0.4 * s, 0xd9432f, { col: false });
  w.mesh(new THREE.ConeGeometry(0.3 * s, 1.8 * s, 6), M(F.X(0, -2.3 * s), y + 10.3 * s, F.Z(0, -2.3 * s), 1, 1, 1, -90, ry, 0), 0xff8a2a, "paint");
  for (const u of [-0.6, 0.6]) F.sph(u * s, 10.9 * s, -1.5 * s, 0.22 * s, 0x1c1f26, { col: false });
  for (const dy of [6.6, 7.6, 8.5]) F.sph(0, dy * s, -2.42 * s + Math.abs(dy - 7.6) * 0.5 * s, 0.26 * s, 0x1c1f26, { col: false });
  F.cyl(0, 8.75 * s, 0, 1.95 * s, 0.7 * s, 0xd9432f, { col: false, mat: "paint" }); F.box(1.2 * s, 6.6 * s, -1.9 * s, 0.9 * s, 2.4 * s, 0.3 * s, 0xd9432f, { col: false, mat: "paint", rz: -12 });
  // 나뭇가지 팔
  for (const sd of [-1, 1]) {
    F.beam(sd * 2.2 * s, 7.8 * s, 0, sd * 8.2 * s, 9.6 * s, 0, 0.28 * s, 0x4f3826, { mat: "std" });
    F.beam(sd * 6.4 * s, 9.05 * s, 0, sd * 7.4 * s, 10.6 * s, 0.4 * s, 0.16 * s, 0x4f3826, { mat: "std", col: false });
  }
  return F;
}

// 눈발: 카메라를 따라다니는 상자 안에서 되풀이되는 점 구름(메시 하나, 갱신은 시간 유니폼뿐)
export function snowfall(w, count = 1400, box = 90) {
  const pos = new Float32Array(count * 3), r = w.rand;
  for (let i = 0; i < count * 3; i++) pos[i] = r() * box;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const u = { time: { value: 0 }, box: { value: box } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float time, box; varying float vA;
      void main(){
        vec3 p = position;
        p.y -= time * (1.6 + fract(position.x * 7.13) * 1.4);
        p.x += sin(time * 0.7 + position.z * 0.37) * 1.2 + time * 0.9;
        p.z += cos(time * 0.5 + position.x * 0.41) * 1.2;
        p = mod(p - cameraPosition, box) - box * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = clamp(150.0 / max(d, 1.0), 1.0, 7.0);
        vA = smoothstep(box * 0.5, box * 0.3, d) * smoothstep(1.5, 5.0, d);
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.2, length(c)) * vA * 0.85; if (a < 0.02) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, a); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 8;
  w.scene.add(pts);
  w.disposables.push(g, m);
  w.updaters.push((dt, t) => { u.time.value = t; });
  return pts;
}

// 꺾은선을 따라 일정 속도로 움직이는 위치 계산기. pts: [x,y,z][]
export function polyPath(pts, closed = false) {
  const P = closed ? [...pts, pts[0]] : pts, seg = [], out = [0, 0, 0, 0];
  let len = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1], P[i + 1][2] - P[i][2]); seg.push(l); len += l; }
  return {
    len,
    // s(m) 위치 → [x, y, z, yaw(rad)]
    at(s) {
      s = closed ? ((s % len) + len) % len : Math.min(len, Math.max(0, s));
      let i = 0;
      while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
      const k = seg[i] ? s / seg[i] : 0, a = P[i], b = P[i + 1];
      out[0] = a[0] + (b[0] - a[0]) * k; out[1] = a[1] + (b[1] - a[1]) * k; out[2] = a[2] + (b[2] - a[2]) * k; out[3] = Math.atan2(b[0] - a[0], b[2] - a[2]);
      return out;
    },
  };
}
