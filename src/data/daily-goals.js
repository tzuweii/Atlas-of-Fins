export const DAILY_GOAL_TEMPLATES = [
  { id: 'common3', text: '捕獲 3 條常見魚', type: 'rarity', target: 'common', goal: 3, reward: 85 },
  { id: 'night1', text: '捕獲 1 條夜間魚', type: 'tag', target: 'night', goal: 1, reward: 110 },
  { id: 'shrimp1', text: '使用小蝦捕獲任意魚類', type: 'bait', target: 'shrimp', goal: 1, reward: 80 },
  { id: 'sell100', text: '販售總值達 100 金幣', type: 'sell', target: 'coins', goal: 100, reward: 75 },
  { id: 'large1', text: '捕獲 1 條大型魚', type: 'size', target: 'large', goal: 1, reward: 105 }
];

// v0.3 compatibility name. New systems should use DAILY_GOAL_TEMPLATES.
export const QUEST_TEMPLATES = DAILY_GOAL_TEMPLATES;
