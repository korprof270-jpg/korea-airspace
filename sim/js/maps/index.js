// 맵 목록
import factory from "./factory.js";
import city from "./city.js";
import canyon from "./canyon.js";
import arena from "./arena.js";
import palace from "./palace.js";
import snow from "./snow.js";
import island from "./island.js";
import moon from "./moon.js";
import orbit from "./orbit.js";
import empire from "./empire.js";
import airbase from "./airbase.js";
import ail from "./ail.js";
import frost from "./frost.js";
import stadium from "./stadium.js";

export const MAP_LIST = [city, canyon, factory, arena, palace, snow, island, moon, orbit, empire, airbase, ail, frost, stadium];
import { addSubjects } from "./extra-subjects.js";
addSubjects(MAP_LIST);
import { applyRoutes } from "./tracking-routes.js";
applyRoutes(MAP_LIST);   // 비행 피사체의 경로를 구조물 사이를 꿰는 것으로 바꾼다 (목록 순서·id 는 그대로)
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
