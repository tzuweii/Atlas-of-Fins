import { FISH_MARKET_OWNER_ID, LIGHTHOUSE_KEEPER_ID } from "./residents.js";
import { SLEEPING_TIDE_BAY_ID } from "./regions.js";

const coins = amount => ({ type: "coins", amount, label: `${amount} 金幣` });
const bait = (baitId, amount, label) => ({ type: "bait", baitId, amount, label });

export const COMMISSION_TEMPLATES = [
  {
    id: "keeper_shore_notes",
    residentId: LIGHTHOUSE_KEEPER_ID,
    title: "淺灘的潮聲",
    description: "在近岸捕獲 2 條魚，替燈塔補上一筆今日海況。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], spotIds: ["shore"] },
    reward: coins(75),
    completionDialogue: "潮聲和你記得的一樣。謝謝你把海面平安的消息帶回來。"
  },
  {
    id: "keeper_gentle_light",
    residentId: LIGHTHOUSE_KEEPER_ID,
    title: "晨昏的微光",
    description: "在清晨或黃昏捕獲 2 條魚，看看光線落在海面的模樣。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], timeIds: ["dawn", "dusk"] },
    reward: bait("bread", 4, "麵包糰 4 份"),
    completionDialogue: "晨昏的光最容易被忽略。你留下的紀錄很溫柔。"
  },
  {
    id: "keeper_reef_marker",
    residentId: LIGHTHOUSE_KEEPER_ID,
    title: "礁石旁的航標",
    description: "在礁石邊緣捕獲 2 條魚，確認航標附近的魚群仍然安穩。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], spotIds: ["reef"] },
    reward: coins(95),
    completionDialogue: "航標附近一切如常。今晚經過的船會更安心一些。"
  },
  {
    id: "keeper_common_current",
    residentId: LIGHTHOUSE_KEEPER_ID,
    title: "尋常的潮路",
    description: "捕獲 3 條常見魚，替日常潮路留下簡單記號。",
    goal: 3,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], rarityIds: ["common"] },
    reward: coins(80),
    completionDialogue: "尋常的魚群還在熟悉的潮路上，這就是很好的消息。"
  },
  {
    id: "market_common_basket",
    residentId: FISH_MARKET_OWNER_ID,
    title: "日常魚簍",
    description: "捕獲 3 條常見魚，替市場準備今天的家常漁獲。",
    goal: 3,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], rarityIds: ["common"] },
    reward: coins(85),
    completionDialogue: "就是這種日常魚簍最好。每一條都有人等著帶回家。"
  },
  {
    id: "market_fair_sale",
    residentId: FISH_MARKET_OWNER_ID,
    title: "剛好的買賣",
    description: "手動販售總值達 120 金幣，讓市場的木牌再添幾筆紀錄。",
    goal: 120,
    condition: { eventType: "sell", metric: "amount" },
    reward: coins(90),
    completionDialogue: "數目剛剛好。買賣不用急，能讓彼此安心才重要。"
  },
  {
    id: "market_bread_trial",
    residentId: FISH_MARKET_OWNER_ID,
    title: "麵包糰的小試驗",
    description: "使用麵包糰捕獲 2 條魚，替新調整的配方留點回饋。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], baitIds: ["bread"] },
    reward: bait("shrimp", 2, "小蝦 2 份"),
    completionDialogue: "看來新的軟硬度正合適。這些小蝦你也帶著，換換口味。"
  },
  {
    id: "market_shrimp_trial",
    residentId: FISH_MARKET_OWNER_ID,
    title: "礁香的小蝦",
    description: "使用小蝦捕獲 2 條魚，看看這批補給是否合魚群胃口。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [SLEEPING_TIDE_BAY_ID], baitIds: ["shrimp"] },
    reward: coins(95),
    completionDialogue: "魚群喜歡就好。下次進貨，我會照這個方式準備。"
  }
];

export function commissionTemplateById(templateId) {
  return COMMISSION_TEMPLATES.find(template => template.id === templateId);
}

export function getResidentCommissionTemplates(residentId) {
  return COMMISSION_TEMPLATES.filter(template => template.residentId === residentId);
}
