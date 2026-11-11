// 화면 효과 관리자: 상태(공격·명중·충돌·조준·피해 등)에 따른 화면 흔들림·색·진동
// emit(type, k, data) 로 사건을 알리면 update() 가 카메라를 흔들고 draw() 가 HUD 캔버스에 색 효과를 그린다
import { settings } from "./config.js";

export class Feel {
  constructor(session) {
    this.s = session;
    this.trauma = 0;      // 0..1 흔들림 양
  }

  // 사건 알림. type: fire | missile | hit | kill | hurt | crash | gate | lap | pickup | lock | warn | boost | emp ...
  emit(type, k = 1, data = null) { void type; void k; void data; }

  // 효과음이 재생될 때마다 호출됨 (audio.js). 소리 이름으로 사건을 유추할 수 있다
  onSound(name, vol) { void name; void vol; }

  // 카메라 자세가 정해진 직후 호출: 흔들림·FOV 변화를 카메라에 더한다
  update(dt, camera) { void dt; void camera; void settings; }

  // HUD 캔버스에 전체 화면 색 효과를 그린다 (HUD 요소보다 먼저)
  draw(hud) { void hud; }

  dispose() {}
}
