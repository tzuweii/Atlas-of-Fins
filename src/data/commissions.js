import { CHENGYE_ID, FISH_MARKET_OWNER_ID, JICEN_ID, LIGHTHOUSE_KEEPER_ID, WUHE_ID } from "./residents.js";
import {
  LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID, MONSOON_ARCHIPELAGO_ID,
  SLEEPING_TIDE_BAY_ID
} from "./regions.js";

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
  },
  {
    id: "chengye_lagoon_colors",
    residentId: CHENGYE_ID,
    title: "潟湖的日常水色",
    description: "在風棲淺灘記錄 2 條魚，替觀測簿補上今天的淺水色。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [LUMINOUS_ARCHIPELAGO_ID], spotIds: ["windrest_shallows"] },
    reward: coins(85),
    completionDialogue: "這兩筆剛剛好。潟湖沒有特別表演，日常的顏色也很值得留下。"
  },
  {
    id: "chengye_coral_margin",
    residentId: CHENGYE_ID,
    title: "珊瑚影的邊緣",
    description: "在稜光珊瑚庭記錄 2 條魚，看看牠們如何沿著明暗交界活動。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [LUMINOUS_ARCHIPELAGO_ID], spotIds: ["prism_coral_garden"] },
    reward: bait("shrimp", 3, "小蝦 3 份"),
    completionDialogue: "原來今天牠們更靠近陰面。謝謝你沒為了觀察去打亂珊瑚庭。"
  },
  {
    id: "chengye_common_school",
    residentId: CHENGYE_ID,
    title: "尋常魚群的方向",
    description: "在琉光群島記錄 3 條常見魚，替魚群潮路畫幾個輕巧箭頭。",
    goal: 3,
    condition: { eventType: "catch", regionIds: [LUMINOUS_ARCHIPELAGO_ID], rarityIds: ["common"] },
    reward: coins(90),
    completionDialogue: "常見不是普通，是牠們願意一直把生活留給我們看。"
  },
  {
    id: "chengye_blue_channel",
    residentId: CHENGYE_ID,
    title: "藍渠外緣",
    description: "在暖流藍渠記錄 2 條魚，替較深的潮路留下安全註記。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [LUMINOUS_ARCHIPELAGO_ID], spotIds: ["warm_current_channel"] },
    reward: coins(110),
    completionDialogue: "深藍那一頁有了新的邊線。下次看見同一股流，就不會覺得陌生了。"
  },
  {
    id: "chengye_night_silhouettes",
    residentId: CHENGYE_ID,
    title: "夜礁的普通身影",
    description: "在琉光群島夜間記錄 2 條魚，不必等待任何稀有訪客。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [LUMINOUS_ARCHIPELAGO_ID], timeIds: ["night"] },
    reward: bait("glow", 2, "發光魚餌 2 份"),
    completionDialogue: "夜裡不是只有稀有的東西才會發亮。這些普通剪影已經說了很多。"
  },
  {
    id: "wuhe_fogfront_turns",
    residentId: WUHE_ID,
    title: "霧線轉身記號",
    description: "在霧線陸棚記錄 2 條魚，替今天的潮界補上轉身位置。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MIST_CAPE_COLD_CURRENT_ID], spotIds: ["fogfront_shelf"] },
    reward: coins(105),
    completionDialogue: "兩筆位置已經夠清楚了。界線今天在這裡，明天可以放心換地方。"
  },
  {
    id: "wuhe_kelp_backflow",
    residentId: WUHE_ID,
    title: "林下背流",
    description: "在低語海藻林記錄 2 條魚，看看葉片背後哪一層水最安穩。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MIST_CAPE_COLD_CURRENT_ID], spotIds: ["whispering_kelp_forest"] },
    reward: bait("shrimp", 3, "小蝦 3 份"),
    completionDialogue: "原來今天林下的慢水更靠近岩根。謝謝你沒有為了數字多擾動葉片。"
  },
  {
    id: "wuhe_cold_current_common",
    residentId: WUHE_ID,
    title: "寒流的尋常住民",
    description: "在霧岬記錄 3 條常見魚，替雙流剖面補上日常底色。",
    goal: 3,
    condition: { eventType: "catch", regionIds: [MIST_CAPE_COLD_CURRENT_ID], rarityIds: ["common"] },
    reward: coins(100),
    completionDialogue: "醒目的訪客會離開，尋常魚群才把今天的水溫好好留了下來。"
  },
  {
    id: "wuhe_bluecold_sounding",
    residentId: WUHE_ID,
    title: "深槽測深",
    description: "在藍寒深槽記錄 2 條魚，確認最慢的冷水層仍在原來深度。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MIST_CAPE_COLD_CURRENT_ID], spotIds: ["bluecold_trench"] },
    reward: coins(125),
    completionDialogue: "深槽仍慢慢呼吸。這兩筆不需要更大，已經足以讓藍線站穩。"
  },
  {
    id: "wuhe_mist_night",
    residentId: WUHE_ID,
    title: "夜霧的第二條線",
    description: "在霧岬夜間記錄 2 條魚，不必等待任何稀有或史詩身影。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MIST_CAPE_COLD_CURRENT_ID], timeIds: ["night"] },
    reward: bait("glow", 2, "發光魚餌 2 份"),
    completionDialogue: "船燈只照見很近的水，兩筆普通夜影已經把第二條線說清楚了。"
  },
  {
    id: "jicen_windward_lines",
    residentId: JICEN_ID,
    title: "今日白沫方向",
    description: "在迎風白沫水道記錄 2 條魚，替風候石補上今天的浪向。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MONSOON_ARCHIPELAGO_ID], spotIds: ["windward_whitecap_passage"] },
    reward: coins(115),
    completionDialogue: "兩道拉力指向同一側。今天的白沫線已經足夠清楚。"
  },
  {
    id: "jicen_leeward_grass",
    residentId: JICEN_ID,
    title: "背風草葉角度",
    description: "在背風海草灣記錄 2 條魚，看看草床今天收住多少水流。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MONSOON_ARCHIPELAGO_ID], spotIds: ["leeward_seagrass_bay"] },
    reward: bait("shrimp", 3, "小蝦 3 份"),
    completionDialogue: "魚停得比昨天更靠草冠。風沒有停，只是被葉片拆細了。"
  },
  {
    id: "jicen_mangrove_color",
    residentId: JICEN_ID,
    title: "紅樹岸水色",
    description: "在雨脈紅樹岸記錄 2 條魚，替鹽度杯旁補上今日水色。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MONSOON_ARCHIPELAGO_ID], spotIds: ["rainmangrove_estuary"] },
    reward: coins(125),
    completionDialogue: "顏色與魚的位置都記下了。它們一起看，才不會把深色誤認成單一答案。"
  },
  {
    id: "jicen_common_windbook",
    residentId: JICEN_ID,
    title: "季風的日常魚頁",
    description: "在季風群島記錄 3 條常見魚，替研究冊補上不醒目卻可靠的底色。",
    goal: 3,
    condition: { eventType: "catch", regionIds: [MONSOON_ARCHIPELAGO_ID], rarityIds: ["common"] },
    reward: coins(105),
    completionDialogue: "常見魚每天都在回應風。這三筆比一次罕見浪花更能說明港口。"
  },
  {
    id: "jicen_rain_plume",
    residentId: JICEN_ID,
    title: "淡水羽流外緣",
    description: "在季風群島雨天記錄 2 條魚，不必等待稀有訪客。",
    goal: 2,
    condition: { eventType: "catch", regionIds: [MONSOON_ARCHIPELAGO_ID], weatherIds: ["rain"] },
    reward: bait("glow", 2, "發光魚餌 2 份"),
    completionDialogue: "雨把魚群重新排過，兩筆普通位置就已經讓羽流有了輪廓。"
  }
];

export function commissionTemplateById(templateId) {
  return COMMISSION_TEMPLATES.find(template => template.id === templateId);
}

export function getResidentCommissionTemplates(residentId) {
  return COMMISSION_TEMPLATES.filter(template => template.residentId === residentId);
}
