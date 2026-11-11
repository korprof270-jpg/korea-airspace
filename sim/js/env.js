// 환경 셰이더: 구름·별이 있는 하늘, 환경 반사맵, 물결치는 수면, 삼면 투영 지형 재질, 높이 격자
import * as THREE from "../vendor/three.module.min.js";
import { texSet } from "./textures.js";

const NOISE = `
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.03 + vec2(17.0, 9.0); a *= 0.5; } return s; }
float fbm2(vec2 p){ return 0.62 * vnoise(p) + 0.38 * vnoise(p * 2.07 + vec2(17.0, 9.0)); }
`;

// 하늘 돔. e: 맵 env 설정
export function makeSky(e) {
  const sky = e.sky || {};
  const uniforms = {
    top: { value: new THREE.Color(sky.top ?? 0x2f6fd0) }, hor: { value: new THREE.Color(sky.horizon ?? 0xbfe0f7) }, bot: { value: new THREE.Color(sky.bottom ?? 0x9fb7c9) },
    sunDir: { value: new THREE.Vector3(...(e.sunDir || [0.45, 0.8, 0.35])).normalize() }, sunCol: { value: new THREE.Color(e.sunColor ?? 0xfff3d6) },
    sunSize: { value: e.night ? 0.99965 : 0.9995 }, sunPow: { value: e.sunDisc ?? (e.night ? 2.5 : 7) },
    cloud: { value: e.cloud ?? 0.5 }, cloudLit: { value: new THREE.Color(e.cloudLit ?? 0xffffff) }, cloudDark: { value: new THREE.Color(e.cloudDark ?? 0x8f9db3) },
    night: { value: e.stars ? 1 : 0 }, time: { value: 0 }, glow: { value: new THREE.Color(e.horizonGlow ?? 0x000000) },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vDir;
      uniform vec3 top, hor, bot, sunDir, sunCol, cloudLit, cloudDark, glow; uniform float sunSize, sunPow, cloud, night, time;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.48));
        c = mix(c, bot, smoothstep(0.0, -0.22, h));
        c += glow * exp(-abs(h) * 9.0);
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 5.0) * 0.10 + pow(s, 40.0) * 0.30);
        if (night > 0.0 && h > 0.0) {
          vec2 g = d.xz / (h + 0.35) * 120.0; vec2 id = floor(g); float r = hash21(id);
          vec2 o = vec2(hash21(id + 3.1), hash21(id + 7.7)) - 0.5;
          float st = step(0.965, r) * smoothstep(0.22, 0.0, length(fract(g) - 0.5 - o * 0.6));
          c += vec3(0.9, 0.95, 1.0) * st * (0.7 + 0.5 * sin(time * 1.7 + r * 60.0)) * smoothstep(0.0, 0.25, h) * 1.6;
        }
        if (cloud > 0.0 && h > 0.005) {
          vec2 uv = d.xz / (h + 0.14) * 1.25 + vec2(time * 0.006, time * 0.002);
          float n = fbm(uv);
          float m = smoothstep(1.0 - cloud, 1.0 - cloud + 0.3, n) * smoothstep(0.005, 0.16, h);
          float shade = fbm(uv + sunDir.xz * 0.22);
          vec3 cc = mix(cloudDark, cloudLit, clamp((n - shade) * 2.2 + 0.62, 0.0, 1.0)) + sunCol * pow(s, 10.0) * 0.35;
          c = mix(c, cc, m * 0.92);
        }
        c += sunCol * smoothstep(sunSize, sunSize + 0.00025, s) * sunPow;
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

// 하늘을 큐브맵으로 한 번 구워 배경과 주변광·반사에 쓴다 (매 프레임 구름 계산을 하지 않는다)
export function bakeSky(renderer, sky, size = 1024) {
  const sc = new THREE.Scene();
  sc.add(sky);
  const cube = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(1, 4000, cube);
  cam.update(renderer, sc);
  sc.remove(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromCubemap(cube.texture);
  pm.dispose();
  return { cube, env };
}

// 물결·프레넬 반사·햇빛 반짝임이 있는 수면
export function makeWater(size, y, e, color = 0x1f5f7a) {
  const sky = e.sky || {};
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, deep: { value: new THREE.Color(color) }, top: { value: new THREE.Color(sky.top ?? 0x2f6fd0) }, hor: { value: new THREE.Color(sky.horizon ?? 0xbfe0f7) },
      sunDir: { value: new THREE.Vector3(...(e.sunDir || [0.45, 0.8, 0.35])).normalize() }, sunCol: { value: new THREE.Color(e.sunColor ?? 0xfff3d6) },
    }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec3 vW; uniform float time; uniform vec3 deep, top, hor, sunDir, sunCol;
      #include <fog_pars_fragment>
      ${NOISE}
      void main(){
        vec2 p = vW.xz;
        float e = 0.35;
        vec2 f1 = vec2(time * 0.35, time * 0.12), f2 = vec2(time * 0.5, time * 0.8);
        float h0 = fbm2(p * 0.3 + f1) + 0.4 * vnoise(p * 1.3 - f2);
        float hx = fbm2((p + vec2(e, 0.0)) * 0.3 + f1) + 0.4 * vnoise((p + vec2(e, 0.0)) * 1.3 - f2);
        float hz = fbm2((p + vec2(0.0, e)) * 0.3 + f1) + 0.4 * vnoise((p + vec2(0.0, e)) * 1.3 - f2);
        vec3 n = normalize(vec3((h0 - hx) * 0.9, 1.0, (h0 - hz) * 0.9));
        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 R = reflect(-V, n); R.y = abs(R.y);
        vec3 skyc = mix(hor, top, pow(clamp(R.y, 0.0, 1.0), 0.5));
        float spec = pow(max(dot(R, sunDir), 0.0), 220.0) * 9.0;
        vec3 c = mix(deep * (0.6 + 0.4 * h0), skyc, fres) + sunCol * spec;
        gl_FragColor = vec4(c, mix(0.82, 0.98, fres));
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

// 지형 재질: 경사에 따라 풀/흙 ↔ 암석을 섞고 절벽은 삼면 투영으로 늘어짐 없이 입힌다
export function makeTerrainMaterial(o = {}) {
  const rock = texSet("rock"), flat = texSet(o.flat || "grass");
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.55 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tRock = { value: rock.map }; sh.uniforms.tFlat = { value: flat.map };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * normal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm; uniform sampler2D tRock, tFlat;")
      .replace("#include <map_fragment>", `
        vec3 wn = normalize(vWNrm);
        vec3 bw = pow(abs(wn), vec3(5.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 rk = texture2D(tRock, vWPos.zy * 0.055).rgb * bw.x + texture2D(tRock, vWPos.xz * 0.055).rgb * bw.y + texture2D(tRock, vWPos.xy * 0.055).rgb * bw.z;
        vec3 fl = texture2D(tFlat, vWPos.xz * 0.16).rgb;
        float tk = smoothstep(${(o.rockLo ?? 0.22).toFixed(2)}, ${(o.rockHi ?? 0.42).toFixed(2)}, 1.0 - wn.y + (rk.g - 0.5) * 0.18);
        diffuseColor.rgb *= mix(fl * vec3(${o.flatTint || "1.0, 1.0, 1.0"}), rk * vec3(${o.rockTint || "1.0, 1.0, 1.0"}), tk);
      `);
  };
  return mat;
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
