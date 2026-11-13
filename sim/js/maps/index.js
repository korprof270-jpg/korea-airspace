// 맵 목록
import factory from "./factory.js";
import city from "./city.js";
import canyon from "./canyon.js";
import arena from "./arena.js";
import snow from "./snow.js";
import island from "./island.js";
import moon from "./moon.js";

export const MAP_LIST = [city, canyon, factory, arena, snow, island, moon];
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
