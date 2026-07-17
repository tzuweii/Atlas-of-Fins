import { SLEEPING_TIDE_BAY_ID } from "./regions.js";

export const LIGHTHOUSE_KEEPER_ID = "lighthouse_keeper";
export const FISH_MARKET_OWNER_ID = "fish_market_owner";

export const RESIDENTS = [
  {
    id: LIGHTHOUSE_KEEPER_ID,
    name: "燈塔守望者",
    role: "眠潮灣的燈火與海況記錄者",
    regionId: SLEEPING_TIDE_BAY_ID,
    portLocationId: "sleeping_tide_lighthouse_path",
    portLocationName: "燈塔小徑",
    icon: "◇",
    dialogue: {
      greeting: "今天的光很柔和。若要出海，就讓燈塔替你記著回來的方向。",
      offer: "若你剛好會經過那片海，替我留意一下就好。不必特地趕路。",
      active: "慢慢來，海況的紀錄從不催人。",
      ready: "你帶回來的消息，會讓今晚的燈照得更安穩。",
      farewell: "去走自己的潮路吧。這盞燈會一直在。"
    }
  },
  {
    id: FISH_MARKET_OWNER_ID,
    name: "魚市場老闆",
    role: "替港口整理漁獲與補給的老闆",
    regionId: SLEEPING_TIDE_BAY_ID,
    portLocationId: "sleeping_tide_fish_market",
    portLocationName: "魚市場棚屋",
    icon: "▤",
    dialogue: {
      greeting: "魚簍先放這裡也行。喝口水，再想今天要不要多走一趟。",
      offer: "市場正好缺一點日常漁獲，有順手遇見的再帶回來就好。",
      active: "不用挑最漂亮的，平常的收穫就很有用了。",
      ready: "剛剛好。港口今晚又能多一鍋熱湯。",
      farewell: "不做也沒關係，明天的市場還是照常開門。"
    }
  }
];

export function residentById(residentId) {
  return RESIDENTS.find(resident => resident.id === residentId);
}

export function getRegionResidents(regionId) {
  return RESIDENTS.filter(resident => resident.regionId === regionId);
}
