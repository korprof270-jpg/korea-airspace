// 진영별 적 외형
//  eia: 에이아 제국 기계 병기 (휴마 연합 본편·에이아 잔존 함대)
//  ail: 에일 행성 외계 종족 (우주선·비행체·날아다니는 외계 생명체)
// factionModel(faction, kind, color) → THREE.Group | null
//   kind: grunt ace kamikaze gunship jet boss. color = 계급 색(포인트에 쓴다)
//   반환 모델은 -z 가 앞, userData.tick(dt, thrust, time) 와 userData.dispose() 를 갖는다
//   null 이면 기본 드론 모델을 쓴다
// decorateUnit(unit, type, faction): 지상·함선 유닛(tank aa frigate cruiser mech)에 진영 외피를 입힌다
import * as THREE from "../vendor/three.module.min.js";

export function factionModel(faction, kind, color) {
  return null;
}

const _purple = new THREE.Color(0x4a1f8c);
export function decorateUnit(u, type, faction) {
  if (faction !== "ail") return;
  const seen = new Map();
  u.group.traverse((m) => {
    if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
    let mat = seen.get(m.material);
    if (!mat) {
      mat = m.material.clone();
      if (mat.color) { const hsl = {}; mat.color.getHSL(hsl); if (hsl.l < 0.75) mat.color.lerp(_purple, hsl.s < 0.35 ? 0.6 : 0.3); }
      seen.set(m.material, mat);
    }
    m.material = mat;
  });
}
