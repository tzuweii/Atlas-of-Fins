export const JOURNAL_TEMPLATE_VERSION = 1;

export const JOURNAL_EVENT_TEMPLATES = Object.freeze([
  { id: "rare_fish_encounter", eventType: "fish.discovered", entryType: "fish-encounter", permanent: true },
  { id: "first_route_direction", eventType: "route.departed", entryType: "route", permanent: true },
  { id: "first_region_arrival", eventType: "region.arrived", entryType: "arrival", permanent: true },
  { id: "formal_observation", eventType: "observation.recorded", entryType: "observation", permanent: true },
  { id: "wonder_recorded", eventType: "wonder.recorded", entryType: "wonder", permanent: true },
  { id: "research_node", eventType: "research.node.completed", entryType: "research", permanent: true },
  { id: "region_research", eventType: "research.region.completed", entryType: "research", permanent: true },
  { id: "resident_story", eventType: "resident.story.completed", entryType: "resident", permanent: true },
  { id: "ship_purchased", eventType: "ship.purchased", entryType: "ship", permanent: true },
  { id: "region_complete", eventType: "region.completed", entryType: "completion", permanent: true },
  { id: "world_complete", eventType: "world.completed", entryType: "completion", permanent: true }
]);

export const FISH_ENCOUNTER_LINES = Object.freeze({
  dawn: ["晨光剛落上海面，我在{spotName}第一次認出{fishName}。", "霧色尚未散盡，{fishName}把名字留進我的圖鑑。"],
  day: ["日光照清水紋時，我第一次遇見{fishName}。", "明亮的潮水裡，{fishName}成了今天新認識的身影。"],
  dusk: ["晚霞貼近海面，我在回光裡第一次認出{fishName}。", "天色慢慢轉柔時，{fishName}游進了圖鑑的新一頁。"],
  night: ["船燈照到水面，我第一次看清{fishName}的輪廓。", "星光落在潮線上，{fishName}安靜地有了名字。"]
});

export const DAILY_POETIC_LINES = Object.freeze({
  sleeping_tide_bay: [
    "港灣把今天的聲音收得很輕，只讓幾道水紋留在頁角。",
    "熟悉的燈火沿著潮線亮起，替今日的紀錄留了一處溫暖空白。"
  ],
  luminous_archipelago: [
    "暖流把島間碎光推向船邊，今日的頁面也因此亮了一小角。",
    "風從島鏈之間穿過，紙頁上留著一點珊瑚水色。"
  ],
  rain: [
    "雨點在舷窗外排成細線，今天的潮聲比平常更靠近船屋。",
    "濕潤的風把海面壓得很平，幾段相遇便清楚留在上面。"
  ],
  night: [
    "入夜後，船燈只照亮近處的浪，也照亮今天寫下的幾行字。",
    "星光沒有催促返航，紙頁便陪著船身多搖了一會兒。"
  ],
  default: [
    "船身隨潮水慢慢呼吸，今天發生的事也各自找到了一行位置。",
    "我把真實遇見的事寫下，剩下的空白仍交給下一次潮來。"
  ]
});

export const JOURNAL_ENTRY_TYPE_LABELS = Object.freeze({
  intro: "開篇",
  "fish-encounter": "魚類初遇",
  route: "航程",
  arrival: "抵達",
  observation: "正式觀察",
  wonder: "奇景",
  research: "研究",
  resident: "居民",
  ship: "船隻",
  completion: "完成紀念",
  daily: "今日潮記",
  archive: "十日回望"
});

export function journalTemplateByEventType(eventType) {
  return JOURNAL_EVENT_TEMPLATES.find(template => template.eventType === eventType) || null;
}
