// 맵 목록
import factory from "./factory.js";
import city from "./city.js";
import canyon from "./canyon.js";
import arena from "./arena.js";
import snow from "./snow.js";
import island from "./island.js";
import moon from "./moon.js";
import orbit from "./orbit.js";
import empire from "./empire.js";
import airbase from "./airbase.js";
import ail from "./ail.js";
import frost from "./frost.js";
import outpost from "./outpost.js";
import vault from "./vault.js";
import foundry from "./foundry.js";
import spaceport from "./spaceport.js";
import aildune from "./aildune.js";
import ailsea from "./ailsea.js";
import ailwood from "./ailwood.js";
import ailsky from "./ailsky.js";
import stadium from "./stadium.js";
import { makeRegion } from "./nuri/region.js";
// 누리 대륙 구역별 대형 맵 (대륙 좌표를 공유 — 나중에 한 장으로 합친다)
export const NURI_LIST = ["hanul", "haerim", "bukseol", "jeoksa", "namdo", "e1", "e2", "e3"].map((id) => makeRegion(id));

export const MAP_LIST = [city, canyon, factory, arena, snow, island, moon, orbit, empire, airbase, ail, outpost, vault, foundry, spaceport, aildune, ailsea, ailwood, ailsky, frost, stadium, ...NURI_LIST];
import { addSubjects } from "./extra-subjects.js";
addSubjects(MAP_LIST);
import { applyRoutes } from "./tracking-routes.js";
applyRoutes(MAP_LIST);   // 비행 피사체의 경로를 구조물 사이를 꿰는 것으로 바꾼다 (목록 순서·id 는 그대로)
import { applyInfil } from "./infil-routes.js";
applyInfil(MAP_LIST);   // 구조물 틈새를 꿰는 침투·탈출 코스를 각 맵 tracks 끝에 붙인다
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
