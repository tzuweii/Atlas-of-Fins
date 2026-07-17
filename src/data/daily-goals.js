const coins = amount => ({ type: "coins", amount, label: `${amount} 金幣` });

export const DAILY_GOAL_TEMPLATES = [
  {
    id: "common3",
    text: "捕獲 3 條常見魚",
    goal: 3,
    condition: { eventType: "catch", rarityIds: ["common"] },
    reward: coins(85)
  },
  {
    id: "night1",
    text: "在夜晚捕獲 1 條魚",
    goal: 1,
    condition: { eventType: "catch", timeIds: ["night"] },
    reward: coins(110)
  },
  {
    id: "shrimp1",
    text: "使用小蝦捕獲任意魚類",
    goal: 1,
    condition: { eventType: "catch", baitIds: ["shrimp"] },
    reward: coins(80)
  },
  {
    id: "sell100",
    text: "手動販售總值達 100 金幣",
    goal: 100,
    condition: { eventType: "sell", metric: "amount" },
    reward: coins(75)
  },
  {
    id: "large1",
    text: "捕獲 1 條大型魚",
    goal: 1,
    condition: { eventType: "catch", sizeTiers: ["large", "record"] },
    reward: coins(105)
  }
];

// v0.3 compatibility export. Entries now use the structured v0.4 condition and reward schema.
export const QUEST_TEMPLATES = DAILY_GOAL_TEMPLATES;
