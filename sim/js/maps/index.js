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

export const MAP_LIST = [city, canyon, factory, arena, palace, snow, island, moon, orbit, empire, airbase];
import { addSubjects } from "./extra-subjects.js";
addSubjects(MAP_LIST);
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
