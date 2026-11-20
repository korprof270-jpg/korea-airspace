// 툰(셀) 셰이딩 공용 모듈: 밴드 조명 재질, 평면 색을 살리는 톤매핑, 기존 PBR/램버트 재질의 일괄 변환
// 다른 파일에서 쓰는 법:
//   import { toonMat, toonify } from "./toon.js";
//   const m = toonMat({ color: 0x3a4250, spec: 0.5, rim: 0.4 });   // MeshToonMaterial 옵션 + 아래 추가 옵션
//   toonify(group);                                                // 그룹 안의 Standard/Lambert/Phong 재질을 교체
import * as THREE from "../vendor/three.module.min.js";

// ── 조절값 ──────────────────────────────────────────────────
export const TOON = {
  shadowEdge: 0.03,  // 그림자 밴드가 끝나는 N·L 값 (0 = 명암 경계선)
  mid: 0.56,         // 중간 톤 밝기 (그림자 0, 가장 밝은 톤 1)
  soft: 0.035,       // 밴드 경계 부드러움 (0 에 가까울수록 칼같이 끊긴다)
  steps: 2,          // 빛 받는 쪽 단계 수 → 전체 밴드 = steps + 1 (+ 광택 하이라이트)
  shadowLo: 0.3,     // 드리운 그림자 가장자리를 또렷하게 조이는 구간
  shadowHi: 0.7,
  saturation: 1.1,   // 톤매핑 전 채도 보정 (셰이더 상수라 실행 중에는 바뀌지 않는다)
};
const uToon = { value: new THREE.Vector4() };
const uShadow = { value: new THREE.Vector2() };
export function setToon(o = {}) {
  Object.assign(TOON, o);
  uToon.value.set(TOON.shadowEdge, TOON.mid, TOON.soft, Math.max(1, TOON.steps));
  uShadow.value.set(TOON.shadowLo, TOON.shadowHi);
}
setToon();

// ── 톤매핑 ──────────────────────────────────────────────────
// 중간 톤은 그대로 두고 밝은 부분만 부드럽게 눌러, 칠한 색이 탁해지지 않게 한다 (ACES 보다 평면 색에 유리)
export const TONEMAP_GLSL = /* glsl */ `
vec3 toonToneMap( vec3 c ) {
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = max( mix( vec3( l ), c, ${TOON.saturation.toFixed(3)} ), 0.0 );
  const float st = 0.74;
  float peak = max( c.r, max( c.g, c.b ) );
  if ( peak < st ) return c;
  float d = 1.0 - st;
  float np = 1.0 - d * d / ( peak + d - st );
  c *= np / peak;
  float g = 1.0 - 1.0 / ( 0.16 * ( peak - np ) + 1.0 );
  return mix( c, vec3( np ), g );
}`;
// renderer.toneMapping = THREE.CustomToneMapping 일 때 모든 내장 재질이 이 함수를 쓴다 (후처리를 끄는 '낮음' 품질용)
{
  const src = "vec3 CustomToneMapping( vec3 color ) { return color; }";
  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment;
  if (chunk.includes(src)) THREE.ShaderChunk.tonemapping_pars_fragment = chunk.replace(src, TONEMAP_GLSL + "\nvec3 CustomToneMapping( vec3 color ) { return toonToneMap( color * toneMappingExposure ); }");
}

// ── 셰이더 조각 ─────────────────────────────────────────────
const PARS = /* glsl */ `
uniform vec4 uToon;    // x: 그림자 경계, y: 중간 톤, z: 부드러움, w: 밝은 쪽 단계 수
uniform vec2 uToonShadow;
uniform vec4 uSpec;    // rgb: 하이라이트 색×세기, a: 광택 지수
uniform vec4 uRim;     // rgb: 림 라이트 색×세기, a: 경계(0..1, 클수록 가늘다)
float toonRamp( float ndl ) {
  float lit = smoothstep( uToon.x - uToon.z, uToon.x + uToon.z, ndl );
  float v = clamp( ( ndl - uToon.x ) / ( 1.0 - uToon.x ), 0.0, 1.0 ) * uToon.w;
  float st = min( floor( v ) + smoothstep( 1.0 - uToon.z * 2.0 * uToon.w, 1.0, fract( v ) ), uToon.w - 1.0 );
  return lit * mix( uToon.y, 1.0, st / max( uToon.w - 1.0, 1.0 ) );
}
float toonShadow( float s ) { return smoothstep( uToonShadow.x, uToonShadow.y, s ); }
`;
const LIGHTS = /* glsl */ `
varying vec3 vViewPosition;
struct ToonMaterial { vec3 diffuseColor; };
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  float ndl = dot( geometryNormal, directLight.direction );
  reflectedLight.directDiffuse += toonRamp( ndl ) * directLight.color * BRDF_Lambert( material.diffuseColor );
  #ifdef TOON_SPEC
    float sp = pow( max( dot( geometryNormal, normalize( directLight.direction + geometryViewDir ) ), 0.0 ), uSpec.a );
    sp = smoothstep( 0.44, 0.56, sp ) * step( 0.0, ndl );
    #ifdef TOON_METAL
      vec3 sc = uSpec.rgb * ( material.diffuseColor * 1.6 + 0.18 );
    #else
      vec3 sc = uSpec.rgb;
    #endif
    reflectedLight.directDiffuse += directLight.color * sc * ( sp * RECIPROCAL_PI );
  #endif
  #ifdef TOON_RIM
    float rk = 1.0 - max( dot( geometryNormal, geometryViewDir ), 0.0 );
    rk = smoothstep( uRim.a - 0.07, uRim.a + 0.07, rk ) * smoothstep( -0.4, 0.2, ndl );
    reflectedLight.directDiffuse += directLight.color * uRim.rgb * ( material.diffuseColor * 0.7 + 0.3 ) * ( rk * RECIPROCAL_PI );
  #endif
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct RE_Direct_Toon
#define RE_IndirectDiffuse RE_IndirectDiffuse_Toon
`;
// 방향광 그림자 가장자리를 조여 셀 애니메이션 같은 또렷한 그림자를 만든다
const LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace(
  /(\? )(getShadow\( directionalShadowMap[^)]*\))( : 1\.0;)/, "$1toonShadow( $2 )$3");

const NONE = { spec: { value: new THREE.Vector4(0, 0, 0, 48) }, rim: { value: new THREE.Vector4(0, 0, 0, 0.62) } };
function patch(sh) {
  const t = this.toon || NONE;
  sh.uniforms.uToon = uToon; sh.uniforms.uToonShadow = uShadow;
  sh.uniforms.uSpec = t.spec; sh.uniforms.uRim = t.rim;
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <gradientmap_pars_fragment>", PARS)
    .replace("#include <lights_toon_pars_fragment>", LIGHTS)
    .replace("#include <lights_fragment_begin>", LIGHTS_BEGIN);
}

const _c = new THREE.Color();

// 툰 재질. o = MeshToonMaterial 옵션 + {
//   spec(0..1 하이라이트 세기), shine(광택 지수), specColor, metal(하이라이트에 바탕색을 입힘),
//   rim(0..1 림 라이트), rimColor, rimEdge(0..1), flat(면 단위 음영), extend(sh) + key(셰이더 추가 수정) }
export function toonMat(o = {}) {
  const { spec = 0, shine = 48, specColor = 0xffffff, metal = false, rim = 0, rimColor = 0xffffff, rimEdge = 0.62, flat = false, extend = null, key = "", ...rest } = o;
  const m = new THREE.MeshToonMaterial(rest);
  m.toon = { spec: { value: new THREE.Vector4() }, rim: { value: new THREE.Vector4() } };
  _c.set(specColor).multiplyScalar(spec * 1.6); m.toon.spec.value.set(_c.r, _c.g, _c.b, shine);
  _c.set(rimColor).multiplyScalar(rim * 1.3); m.toon.rim.value.set(_c.r, _c.g, _c.b, rimEdge);
  if (spec > 0) m.defines.TOON_SPEC = "";
  if (metal) m.defines.TOON_METAL = "";
  if (rim > 0) m.defines.TOON_RIM = "";
  if (flat) m.flatShading = true;
  if (extend) {
    m.onBeforeCompile = function (sh, r) { patch.call(this, sh); extend.call(this, sh, r); };
    m.customProgramCacheKey = () => "toon:" + key;
  } else m.onBeforeCompile = patch;
  return m;
}

// ── 기존 재질 변환 ──────────────────────────────────────────
const CONV = new WeakMap();
const COPY = ["name", "side", "alphaTest", "depthWrite", "depthTest", "blending", "vertexColors", "fog", "wireframe", "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits", "premultipliedAlpha", "colorWrite", "toneMapped"];
const LINK = ["opacity", "transparent", "visible", "emissiveIntensity"];

function convert(src) {
  if (!src || !(src.isMeshStandardMaterial || src.isMeshLambertMaterial || src.isMeshPhongMaterial)) return src;
  let m = CONV.get(src);
  if (m) return m;
  let spec = 0, shine = 48, metal = false;
  if (src.isMeshStandardMaterial) {
    const gloss = 1 - src.roughness;
    spec = Math.min(0.85, gloss * 0.9 + src.metalness * 0.2); shine = 16 + gloss * 150; metal = src.metalness > 0.5;
    if (spec < 0.2) spec = 0;
  } else if (src.isMeshPhongMaterial) { spec = Math.min(0.7, src.shininess / 120); shine = Math.max(8, src.shininess); }
  m = toonMat({ spec, shine, metal, rim: spec > 0 ? 0.25 : 0 });
  for (const k of COPY) if (src[k] !== undefined) m[k] = src[k];
  for (const k of ["map", "alphaMap", "emissiveMap", "aoMap", "lightMap", "normalMap"]) if (src[k]) m[k] = src[k];
  if (src.flatShading) m.flatShading = true;
  // 색 객체는 공유하고 스칼라 값은 원본으로 연결해, 원본 재질을 고치는 기존 코드(피격 점멸 등)가 그대로 동작하게 한다
  m.color = src.color;
  if (src.emissive) m.emissive = src.emissive;
  for (const k of LINK) if (k in src) Object.defineProperty(m, k, { get: () => src[k], set: (v) => { src[k] = v; }, configurable: true, enumerable: true });
  src.addEventListener("dispose", () => m.dispose());
  CONV.set(src, m);
  return m;
}

// root 아래 모든 메시의 Standard/Lambert/Phong 재질을 툰 재질로 바꾼다 (Basic·Shader 재질은 그대로)
export function toonify(root) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    try { o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material); }
    catch (e) { console.warn("툰 재질 변환 실패", e); }
  });
  return root;
}
