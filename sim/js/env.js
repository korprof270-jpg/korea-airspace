// 환경 셰이더(만화풍): 뭉게구름·별·초승달이 있는 하늘, 반짝임과 물거품 선이 있는 수면, 지층 띠가 보이는 지형 재질, 높이 격자
import * as THREE from "../vendor/three.module.min.js";
import { texSet } from "./textures.js";
import { toonMat } from "./toon.js";

const NOISE = `
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.03 + vec2(17.0, 9.0); a *= 0.5; } return s; }
`;

// 하늘 돔(한 번만 구워 쓰므로 노이즈를 넉넉히 쓴다). e: 맵 env 설정
export function makeSky(e) {
  const sky = e.sky || {};
  const uniforms = {
    top: { value: new THREE.Color(sky.top ?? 0x2f6fd0) }, hor: { value: new THREE.Color(sky.horizon ?? 0xbfe0f7) }, bot: { value: new THREE.Color(sky.bottom ?? 0x9fb7c9) },
    sunDir: { value: new THREE.Vector3(...(e.sunDir || [0.45, 0.8, 0.35])).normalize() }, sunCol: { value: new THREE.Color(e.sunColor ?? 0xfff3d6) },
    sunSize: { value: e.night ? 0.99915 : 0.9983 }, sunPow: { value: e.sunDisc ?? (e.night ? 2.5 : 7) },
    cloud: { value: e.cloud ?? 0.5 }, cloudLit: { value: new THREE.Color(e.cloudLit ?? (e.night ? 0x5f6cc0 : 0xffffff)) }, cloudDark: { value: new THREE.Color(e.cloudDark ?? (e.night ? 0x272b62 : 0x8f9db3)) },
    night: { value: e.stars ? 1 : 0 }, moon: { value: e.night ? 1 : 0 }, glow: { value: new THREE.Color(e.horizonGlow ?? 0x000000) },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vDir;
      uniform vec3 top, hor, bot, sunDir, sunCol, cloudLit, cloudDark, glow; uniform float sunSize, sunPow, cloud, night, moon;
      ${NOISE}
      vec2 hash22(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      // 둥근 뭉치: 가장 가까운 씨앗까지의 거리를 뒤집은 값
      float puff(vec2 p){ vec2 i = floor(p), f = fract(p); float d = 1.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); d = min(d, length(g + hash22(i + g) - f)); }
        return 1.0 - min(d, 1.0); }
      float cloudShape(vec2 uv){ return fbm(uv) * 0.72 + puff(uv * 2.6 + 3.0) * 0.3 + puff(uv * 5.9) * 0.08; }
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        // 그라디언트를 몇 단으로 살짝 끊어 포스터 같은 하늘을 만든다
        float t = pow(clamp(h, 0.0, 1.0), 0.5), tq = (floor(t * 6.0) + smoothstep(0.3, 0.7, fract(t * 6.0))) / 6.0;
        vec3 c = mix(hor, top, mix(t, tq, 0.6));
        c = mix(c, bot, smoothstep(0.0, -0.2, h));
        c += glow * exp(-abs(h) * 9.0);
        float s = max(dot(d, sunDir), 0.0);
        // 해·달 주변 후광: 부드러운 빛 + 두 겹 고리
        c += sunCol * (pow(s, 6.0) * 0.08 + 0.06 * smoothstep(0.958, 0.962, s) + 0.09 * smoothstep(0.988, 0.9905, s));
        if (night > 0.0 && h > 0.0) {
          vec2 g = d.xz / (h + 0.35) * 90.0; vec2 id = floor(g); float r = hash21(id);
          vec2 q = fract(g) - 0.5 - (vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5) * 0.6;
          float st = step(0.955, r) * (1.0 - smoothstep(0.09, 0.13, length(q)));
          // 큰 별은 십자 모양으로 반짝인다
          st = max(st, step(0.992, r) * (1.0 - smoothstep(0.0, 0.04, min(abs(q.x), abs(q.y)))) * (1.0 - smoothstep(0.12, 0.4, length(q))));
          c += vec3(0.85, 0.92, 1.0) * st * (0.6 + 0.9 * hash21(id + 1.7)) * smoothstep(0.0, 0.25, h) * 1.5;
        }
        if (cloud > 0.0 && h > 0.005) {
          vec2 uv = d.xz / (h + 0.14) * 1.1;
          float n = cloudShape(uv), th = mix(0.86, 0.5, cloud);
          float m = smoothstep(th, th + 0.014, n) * smoothstep(0.005, 0.12, h);
          // 해 쪽 면이 밝다: 밝은 면·중간·그늘 3톤
          float k = (n - th) * 3.0 + (n - cloudShape(uv + sunDir.xz * 0.16)) * 2.6 + 0.45;
          vec3 cc = mix(cloudDark, cloudLit, smoothstep(0.3, 0.34, k) * 0.55 + smoothstep(0.62, 0.66, k) * 0.45);
          cc += sunCol * pow(s, 10.0) * 0.3;
          c = mix(c, cc, m * 0.96);
        }
        float disc = smoothstep(sunSize, sunSize + 0.00012, s);
        // 밤에는 초승달
        if (moon > 0.0) disc *= 1.0 - smoothstep(sunSize + 0.0002, sunSize + 0.00032, dot(d, normalize(sunDir + vec3(0.02, 0.012, 0.008))));
        c += sunCol * disc * sunPow;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1900, 32, 20), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

// 하늘을 큐브맵으로 한 번 구워 배경으로 쓴다 (매 프레임 구름 계산을 하지 않는다)
export function bakeSky(renderer, sky, size = 1024) {
  const sc = new THREE.Scene();
  sc.add(sky);
  const cube = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(1, 4000, cube);
  cam.update(renderer, sc);
  sc.remove(sky);
  return { cube };
}

// 만화풍 수면: 2단 색 + 수평선 쪽 하늘빛 띠, 움직이는 물결 선, 햇빛 반짝임, (지형이 있으면) 물가 거품 선
export function makeWater(size, y, e, color = 0x1f5f7a) {
  const sky = e.sky || {};
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, deep: { value: new THREE.Color(color) }, top: { value: new THREE.Color(sky.top ?? 0x2f6fd0) }, hor: { value: new THREE.Color(sky.horizon ?? 0xbfe0f7) },
      sunDir: { value: new THREE.Vector3(...(e.sunDir || [0.45, 0.8, 0.35])).normalize() }, sunCol: { value: new THREE.Color(e.sunColor ?? 0xfff3d6) },
      tShore: { value: null }, shore: { value: new THREE.Vector4(0, 1, 0, 0) }, lightK: { value: e.night ? 0.45 : 1 },
    }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec3 vW; uniform float time, lightK; uniform vec3 deep, top, hor, sunDir, sunCol; uniform sampler2D tShore; uniform vec4 shore;
      #include <fog_pars_fragment>
      ${NOISE}
      void main(){
        vec2 p = vW.xz;
        vec3 V = normalize(cameraPosition - vW);
        float n1 = vnoise(p * 0.21 + vec2(time * 0.3, time * 0.11)), n2 = vnoise(p * 0.47 - vec2(time * 0.21, -time * 0.33));
        float wv = n1 * 0.6 + n2 * 0.4;
        // 내려다볼수록 물빛, 수평선 쪽은 하늘빛: 프레넬을 두 단으로 끊는다
        float fr = 1.0 - max(V.y, 0.0); fr = fr * fr + (wv - 0.5) * 0.16;
        float sk = smoothstep(0.5, 0.53, fr) * 0.45 + smoothstep(0.8, 0.83, fr) * 0.4;
        vec3 c = mix(deep * (0.82 + 0.36 * smoothstep(0.5, 0.52, wv)), mix(hor, top, 0.35) * lightK, sk);
        float a = 0.88;
        // 물결 선: 두 노이즈가 같아지는 등고선. 선이 픽셀보다 가늘어지는 먼 곳에서는 사라진다
        float g = abs(n1 - n2), aa = fwidth(g) + 1.0e-4;
        float ln = (1.0 - smoothstep(0.016, 0.016 + aa * 1.5, g)) * clamp(0.02 / aa - 0.4, 0.0, 1.0);
        // 햇빛 반짝임: 반사 방향이 해와 맞는 띠 안에서만 점점이 빛난다
        vec3 R = vec3(-V.x, V.y, -V.z);
        float glint = smoothstep(0.93, 0.985, dot(R, sunDir)) * step(0.78, vnoise(p * 1.9 + vec2(time * 0.9, -time * 0.6)) + (wv - 0.5) * 0.5);
        float foam = 0.0;
        if (shore.w > 0.5) {
          // 물가: 얕은 곳은 밝은 물빛, 가장자리에는 거품 띠와 바깥으로 숨 쉬듯 움직이는 가는 고리
          float dep = shore.z - texture2D(tShore, (p + shore.x) * shore.y).r * 8.0 + (wv - 0.5) * 0.3;
          float sh = 1.0 - smoothstep(1.5, 1.62, dep);
          c = mix(c, c * 1.25 + vec3(0.03, 0.1, 0.09) * lightK, sh * 0.75);
          a = mix(a, 0.66, sh);
          float ring = dep - 0.95 - sin(time * 0.9) * 0.22;
          foam = max(1.0 - smoothstep(0.3, 0.36, dep), (1.0 - smoothstep(0.05, 0.1, abs(ring))) * 0.8);
        }
        c = mix(c, vec3(1.0, 1.0, 0.97) * lightK, max(foam, ln * 0.55));
        c += sunCol * glint * 1.3;
        gl_FragColor = vec4(c, max(a, max(foam, glint)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const g = new THREE.PlaneGeometry(size, size);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = y;
  mesh.renderOrder = 3;
  return mesh;
}

// 수면 셰이더에 지형 높이(수면 기준 -6..+2m 를 8비트로)를 넘겨 물가 거품을 그리게 한다
export function linkWaterShore(water, hf, waterY) {
  const n = hf.seg + 1, data = new Uint8Array(n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(((hf.data[i] - waterY + 6) / 8) * 255)));
  const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  const u = water.material.uniforms;
  u.tShore.value = tex;
  // uv = (p + half + step/2) / (step * n),  깊이 = 6 - r * 8
  u.shore.value.set(hf.half + hf.step / 2, 1 / (hf.step * n), 6, 1);
  return tex;
}

// 지형 재질: 경사에 따라 풀/흙 ↔ 암석을 또렷하게 나누고, 절벽은 옆면 투영으로 지층이 수평으로 이어지게 한다
export function makeTerrainMaterial(o = {}) {
  const rock = texSet("rock"), flat = texSet(o.flat || "grass");
  const lo = o.rockLo ?? 0.22, hi = o.rockHi ?? 0.42, mid = (lo + hi) / 2;
  const key = ["terrain", o.flat || "grass", o.flatTint || "", o.rockTint || "", lo, hi].join("|");
  return toonMat({
    vertexColors: true, key,
    extend(sh) {
      sh.uniforms.tRock = { value: rock.map }; sh.uniforms.tFlat = { value: flat.map };
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * normal);");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm; uniform sampler2D tRock, tFlat;\nfloat thash(float n){ return fract(sin(n * 12.9898) * 43758.5453); }")
        .replace("#include <map_fragment>", `
          vec3 wn = normalize(vWNrm);
          vec2 bw = pow(abs(wn.xz), vec2(4.0)) + 1.0e-4; bw /= (bw.x + bw.y);
          vec3 rk = texture2D(tRock, vWPos.zy * 0.055).rgb * bw.x + texture2D(tRock, vWPos.xy * 0.055).rgb * bw.y;
          vec3 fl = texture2D(tFlat, vWPos.xz * 0.16).rgb;
          // 큰 지층 띠: 높이에 따라 3톤이 번갈아 나와 멀리서도 절벽의 결이 읽힌다
          float sy = vWPos.y * 0.085 + sin(vWPos.x * 0.013 + vWPos.z * 0.011) * 0.55, sb = floor(sy);
          float st = mix(floor(thash(sb - 1.0) * 3.0), floor(thash(sb) * 3.0), smoothstep(0.0, 0.07, sy - sb));
          rk *= 0.84 + st * 0.13;
          float tk = smoothstep(${(mid - 0.035).toFixed(3)}, ${(mid + 0.035).toFixed(3)}, 1.0 - wn.y + (rk.g - 0.75) * 0.14);
          diffuseColor.rgb *= mix(fl * vec3(${o.flatTint || "1.0, 1.0, 1.0"}), rk * vec3(${o.rockTint || "1.0, 1.0, 1.0"}), tk);
        `);
    },
  });
}

// 지형 높이 격자: 메시와 충돌이 같은 값을 쓰도록 쌍선형 보간
export class HeightField {
  constructor(fn, half, seg) {
    this.half = half; this.seg = seg; this.step = (half * 2) / seg;
    const n = seg + 1, d = (this.data = new Float32Array(n * n));
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) d[j * n + i] = fn(-half + i * this.step, -half + j * this.step);
    this.fn = fn;
  }
  at(x, z) {
    const n = this.seg + 1, fx = (x + this.half) / this.step, fz = (z + this.half) / this.step;
    if (fx < 0 || fz < 0 || fx >= this.seg || fz >= this.seg) return this.fn(x, z);
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, d = this.data, k = j * n + i;
    // 삼각형 분할(PlaneGeometry 와 동일한 대각선)에 맞춘 보간
    const a = d[k], b = d[k + 1], c = d[k + n], e = d[k + n + 1];
    return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : e + (c - e) * (1 - tx) + (b - e) * (1 - tz);
  }
}
