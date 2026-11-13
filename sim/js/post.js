// 후처리 파이프라인: 장면(HDR + 깊이) → 블룸(절반 해상도 이하) → 최종 패스(외곽선 + 블룸 합성 + 톤매핑) → FXAA
// 전체 해상도 패스는 최종 패스와 FXAA 두 번뿐이다. 외곽선은 깊이 버퍼만으로 실루엣과 꺾인 모서리를 찾는다
import * as THREE from "../vendor/three.module.min.js";
import { FullScreenQuad } from "../vendor/pp/postprocessing/Pass.js";
import { UnrealBloomPass } from "../vendor/pp/postprocessing/UnrealBloomPass.js";
import { FXAAShader } from "../vendor/pp/shaders/FXAAShader.js";
import { TONEMAP_GLSL } from "./toon.js";

// ── 외곽선 조절값 (실행 중에 바꿔도 다음 프레임부터 반영) ──
export const OUTLINE = {
  enabled: true,
  thickness: 1.0,     // 선 굵기: 화면 높이 1080px 기준 샘플 간격(px). 실제 선 폭은 약 2배
  strength: 0.9,      // 선 진하기 (0..1)
  lo: 0.9, hi: 1.35,  // 검출 문턱: 낮추면 완만한 모서리·작은 단차에도 선이 생긴다
  color: 0x0b0f24,    // 잉크 색: 선 = 아래 색 × mul + color
  mul: 0.1,
  fadeNear: 160,      // 이 거리(m)부터 선이 옅어져
  fadeFar: 900,       // 여기서 farStrength 배가 된다
  farStrength: 0.3,
};

// ── 화면 공간 음영·대기·색 보정 조절값 ──
export const LOOK = {
  ao: 0.55,          // 구석·접지 음영 세기 (0 = 끔)
  aoRadius: 0.85,    // 음영을 찾는 반경(m)
  scatter: 0.3,      // 해 쪽 먼 풍경에 번지는 빛
  vignette: 0.2,     // 화면 가장자리 어둡게
  contrast: 0.16,    // 톤매핑 뒤 S 곡선 세기
};

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }";
const FRAG = /* glsl */ `
uniform sampler2D tColor; uniform highp sampler2D tDepth; uniform sampler2D tBloom;
uniform vec2 texel; uniform vec4 cam; uniform vec4 line; uniform vec3 fade; uniform vec3 ink; uniform float exposure, inkMul;
uniform vec4 look; uniform vec3 aoP; uniform vec3 aoTint; uniform mat3 camRot; uniform vec2 tanXY; uniform vec3 sunDir; uniform vec4 sunCol;
varying vec2 vUv;
${TONEMAP_GLSL}
vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( max( c, 0.0 ), vec3( 0.41666 ) ) - 0.055, step( 0.0031308, c ) ); }
void main() {
  vec3 c = texture2D( tColor, vUv ).rgb;
  #ifdef LOOKFX
  {
    float dc = texture2D( tDepth, vUv ).x;
    if ( dc < 0.99999 ) {
      float zc = cam.x / ( 1.0 - dc + cam.w );
      // 접지·구석 음영: 마주 보는 두 점보다 가운데가 움푹하면(깊이의 2차 차분) 어둡게. 평면에서는 0 이라 바닥에 얼룩이 생기지 않는다
      float rad = clamp( aoP.x / zc, 2.0, 48.0 ), occ = 0.0;
      for ( int i = 0; i < 4; i++ ) {
        float a = 0.3927 + float( i ) * 0.7854;
        vec2 dir = vec2( cos( a ), sin( a ) ) * texel;
        for ( int k = 1; k <= 2; k++ ) {
          vec2 o = dir * rad * float( k ) * 0.5;
          float da = texture2D( tDepth, vUv + o ).x, db = texture2D( tDepth, vUv - o ).x;
          float za = cam.x / ( 1.0 - da + cam.w ), zb = cam.x / ( 1.0 - db + cam.w );
          float conc = ( 2.0 * dc - da - db ) * zc * zc / cam.x * 0.5;       // 움푹한 정도(m)
          float keep = step( abs( zc - za ), aoP.y * 3.0 ) * step( abs( zc - zb ), aoP.y * 3.0 );
          occ += clamp( conc / ( aoP.y * 0.22 * float( k ) ), 0.0, 1.0 ) * keep;
        }
      }
      occ = min( occ / 8.0 * 2.2, 1.0 ) * look.x * ( 1.0 - smoothstep( 90.0, 260.0, zc ) );
      c = mix( c, c * aoTint, occ );
      // 대기 산란: 해 쪽으로 볼수록, 멀수록 햇빛이 번진다
      vec3 vd = normalize( camRot * vec3( ( vUv * 2.0 - 1.0 ) * tanXY, -1.0 ) );
      float sd = max( dot( vd, sunDir ), 0.0 );
      c += sunCol.rgb * ( pow( sd, 5.0 ) * 0.6 + pow( sd, 32.0 ) * 0.8 ) * ( 1.0 - exp( -zc / sunCol.a ) ) * look.y;
    }
  }
  #endif
  #ifdef OUTLINE
    // 원근 깊이 값은 평면 위에서 화면 좌표에 대해 선형이므로 2차 차분이 0 이다 → 비스듬한 바닥에 가짜 선이 생기지 않는다.
    // 2차 차분(꺾임·단차)을 픽셀 각도와 1차 차분(기울기)으로 정규화해 실루엣과 꺾인 모서리를 함께 잡는다
    vec2 o = texel * line.w;
    float d0 = texture2D( tDepth, vUv ).x;
    float dl = texture2D( tDepth, vUv - vec2( o.x, 0.0 ) ).x, dr = texture2D( tDepth, vUv + vec2( o.x, 0.0 ) ).x;
    float dd = texture2D( tDepth, vUv - vec2( 0.0, o.y ) ).x, du = texture2D( tDepth, vUv + vec2( 0.0, o.y ) ).x;
    float base = cam.z * ( 1.0 - d0 + cam.w ) + 1.0e-6;       // 픽셀 각도 × (near/거리) + 깊이 양자화 여유
    float mx = abs( dl + dr - 2.0 * d0 ) / ( base + 0.5 * abs( dr - dl ) );
    float my = abs( dd + du - 2.0 * d0 ) / ( base + 0.5 * abs( du - dd ) );
    float e = smoothstep( line.y, line.z, max( mx, my ) );
    float z = cam.x / ( 1.0 - min( d0, min( min( dl, dr ), min( dd, du ) ) ) + cam.w );
    e *= line.x * mix( 1.0, fade.z, smoothstep( fade.x, fade.y, z ) );
    e *= 1.0 - 0.85 * smoothstep( 1.1, 2.2, max( c.r, max( c.g, c.b ) ) );   // 네온·발광체의 밝은 심은 선으로 덮지 않는다
    c = mix( c, c * inkMul + ink, e );
  #endif
  c += texture2D( tBloom, vUv ).rgb;
  c = toonToneMap( c * exposure );
  #ifdef LOOKFX
    c = mix( c, c * c * ( 3.0 - 2.0 * c ), look.w );
    vec2 vq = ( vUv - 0.5 ) * vec2( 1.0, 0.82 );
    c *= 1.0 - look.z * smoothstep( 0.32, 0.86, length( vq ) );
  #endif
  gl_FragColor = vec4( toSRGB( c ), 1.0 );
}`;

export class PostFX {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h) });
    this.ldrRT = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.6, 0.9);
    this.bloom.blendToInput = false;
    this.final = new THREE.ShaderMaterial({
      defines: { OUTLINE: "", LOOKFX: "" }, toneMapped: false, depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        tColor: { value: this.sceneRT.texture }, tDepth: { value: this.sceneRT.depthTexture }, tBloom: { value: this.bloom.bloomTexture },
        texel: { value: new THREE.Vector2(1 / w, 1 / h) }, cam: { value: new THREE.Vector4() }, line: { value: new THREE.Vector4() },
        look: { value: new THREE.Vector4() }, aoP: { value: new THREE.Vector3() }, aoTint: { value: new THREE.Color(0x4a4f78) }, camRot: { value: new THREE.Matrix3() }, tanXY: { value: new THREE.Vector2(1, 1) },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Vector4(0, 0, 0, 300) },
        fade: { value: new THREE.Vector3() }, ink: { value: new THREE.Color() }, inkMul: { value: 0.1 }, exposure: { value: 1 },
      },
    });
    this.fxaa = new THREE.ShaderMaterial({
      toneMapped: false, depthTest: false, depthWrite: false, vertexShader: VERT, fragmentShader: FXAAShader.fragmentShader,
      uniforms: { tDiffuse: { value: this.ldrRT.texture }, resolution: { value: new THREE.Vector2(1 / w, 1 / h) } },
    });
    this.quad = new FullScreenQuad(this.final);
    this.h = h;
    this.outline = true;
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h); this.ldrRT.setSize(w, h); this.bloom.setSize(w, h);
    this.final.uniforms.texel.value.set(1 / w, 1 / h);
    this.fxaa.uniforms.resolution.value.set(1 / w, 1 / h);
    this.h = h;
  }

  render(scene, camera, bloom, exposure) {
    const r = this.renderer, b = this.bloom, f = this.final, u = f.uniforms;
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    b.strength = bloom.strength; b.radius = bloom.radius; b.threshold = bloom.threshold;
    b.render(r, null, this.sceneRT, 0, false);

    const on = OUTLINE.enabled && camera.isPerspectiveCamera === true;
    if (on !== this.outline) { this.outline = on; if (on) f.defines.OUTLINE = ""; else delete f.defines.OUTLINE; f.needsUpdate = true; }
    const n = camera.near, far = camera.far, px = Math.max(1, Math.round((OUTLINE.thickness * this.h) / 1080));
    u.cam.value.set((far * n) / (far - n), 0, (2 / (camera.projectionMatrix.elements[5] * this.h)) * px, n / (far - n));
    u.line.value.set(OUTLINE.strength, OUTLINE.lo, OUTLINE.hi, px);
    u.fade.value.set(OUTLINE.fadeNear, OUTLINE.fadeFar, OUTLINE.farStrength);
    // bloom.outline = { color, mul }: 장면별 잉크(밤 맵은 어두운 면 위에서 밝게 보이는 선)
    const ol = bloom.outline;
    u.ink.value.set(ol ? ol.color : OUTLINE.color);
    u.inkMul.value = ol ? ol.mul : OUTLINE.mul;
    u.exposure.value = exposure;
    // 음영·대기·색 보정 (bloom.look 으로 맵별 덮어쓰기: { ao, aoTint, scatter, sunDir, sunColor, haze, vignette, contrast })
    const lk = bloom.look || {}, pe = camera.projectionMatrix.elements;
    const persp = camera.isPerspectiveCamera === true;
    u.look.value.set(persp ? lk.ao ?? LOOK.ao : 0, lk.sunDir ? lk.scatter ?? LOOK.scatter : 0, lk.vignette ?? LOOK.vignette, lk.contrast ?? LOOK.contrast);
    u.aoP.value.set(LOOK.aoRadius * pe[5] * this.h * 0.5, LOOK.aoRadius, 0);
    u.aoTint.value.set(lk.aoTint ?? 0x4a4f78);
    u.camRot.value.setFromMatrix4(camera.matrixWorld);
    u.tanXY.value.set(1 / pe[0], 1 / pe[5]);
    if (lk.sunDir) { u.sunDir.value.copy(lk.sunDir); const sc = lk.sunColor; u.sunCol.value.set(sc.r, sc.g, sc.b, lk.haze ?? 320); }

    this.quad.material = f;
    r.setRenderTarget(this.ldrRT);
    this.quad.render(r);
    this.quad.material = this.fxaa;
    r.setRenderTarget(null);
    this.quad.render(r);
  }

  dispose() {
    this.sceneRT.depthTexture.dispose(); this.sceneRT.dispose(); this.ldrRT.dispose();
    this.bloom.dispose(); this.final.dispose(); this.fxaa.dispose();
  }
}
