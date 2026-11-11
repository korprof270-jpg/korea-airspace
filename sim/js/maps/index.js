// 맵 목록
import factory from "./factory.js";
import city from "./city.js";
import canyon from "./canyon.js";
import arena from "./arena.js";

export const MAP_LIST = [city, canyon, factory, arena];
export const MAPS = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
