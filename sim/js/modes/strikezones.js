// 돌파 작전 · 맵별 작전 구역: 각 맵의 실제 장소(랜드마크)마다 적이 그곳을 무엇에 쓰는지(use)와 맞는 임무(t)를 정한다
//  name 장소 이름 · x,z 중심(m) · r 반경 · what 어떤 곳인지 · use 적이 그곳을 쓰는 용도 · t 그 장소에 맞는 임무(infil 침투 · fight 교전 · seize 탈취)
//  분기점마다 아직 안 간 장소 중 무작위 셋을 고르고, 임무 종류도 그 장소의 t 중에서 무작위로 정한다 (strike.js _zoneOptions)
const GOAL = {
  infil: (z) => `${z.use}. 레이더망 아래로 낮게 숨어들어 데이터 노드를 부숴라`,
  fight: (z) => `${z.use}. 지키는 적 주력을 정면으로 쓸어버려라`,
  seize: (z) => `${z.use}. 점령 원을 지켜 이곳을 되찾아라`,
};
export const zoneGoal = (z, type) => (z.g && z.g[type]) || GOAL[type](z);
const Z = (name, x, z, r, what, use, t) => ({ name, x, z, r, what, use, t });

export const ZONES = {
  // %%ZONES%% (채우는 중: 비어 있으면 예전 격자 방식)
};
