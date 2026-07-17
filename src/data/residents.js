import { LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID } from "./regions.js";

export const LIGHTHOUSE_KEEPER_ID = "lighthouse_keeper";
export const FISH_MARKET_OWNER_ID = "fish_market_owner";
export const CHENGYE_ID = "chengye";

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
  },
  {
    id: CHENGYE_ID,
    name: "澄野",
    role: "記錄群島生態與暖流變化的研究員",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    portLocationId: "windrest_observation_shed",
    portLocationName: "風棲港觀測棚",
    icon: "◉",
    appearance: "日曬膚色、大圓盤帽、相機與防水筆記本",
    dialogue: {
      greeting: "觀測器今天很安分。你若想去岬角坐坐，記得不用追著任何影子跑。",
      offer: "剛好有幾頁日常紀錄空著。順路遇見什麼，再替我添上就好。",
      active: "不用為了數字改變航程。海會在你照常生活時，把答案慢慢送來。",
      ready: "這些紀錄有魚，也有水色。坐下吧，我們一起把頁角壓平。",
      farewell: "慢慢走。群島的光總會在另一個時段重新排好。"
    }
  }
];

export function residentById(residentId) {
  return RESIDENTS.find(resident => resident.id === residentId);
}

export function getRegionResidents(regionId) {
  return RESIDENTS.filter(resident => resident.regionId === regionId);
}
