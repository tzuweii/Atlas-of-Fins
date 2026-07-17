import { DAILY_GOAL_TEMPLATES } from "../data/daily-goals.js";

export function createDailyQuests(day, templates = DAILY_GOAL_TEMPLATES) {
  if (!Array.isArray(templates) || templates.length === 0) return [];
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  const offset = (safeDay - 1) % templates.length;
  return [0, 1, 3].map((step, index) => {
    const template = templates[(offset + step) % templates.length];
    return { ...template, instanceId: `${safeDay}-${index}-${template.id}`, progress: 0, claimed: false };
  });
}

function questIncrement(quest, event) {
  if (!event || typeof event !== "object") return 0;
  if (event.type === "catch") {
    if (quest.type === "rarity" && event.fish?.rarity === quest.target) return 1;
    if (quest.type === "tag" && event.fish?.tags?.includes(quest.target)) return 1;
    if (quest.type === "bait" && event.baitId === quest.target) return 1;
    if (quest.type === "size" && ["large", "record"].includes(event.caught?.sizeTier)) return 1;
  }
  if (event.type === "sell" && quest.type === "sell") return Math.max(0, Number(event.amount) || 0);
  return 0;
}

export function applyDailyQuestProgress(entries, event) {
  if (!Array.isArray(entries)) return [];
  return entries.map(quest => {
    if (!quest || quest.claimed || quest.progress >= quest.goal) return quest;
    const increment = questIncrement(quest, event);
    if (!increment) return quest;
    return { ...quest, progress: Math.min(quest.goal, quest.progress + increment) };
  });
}

export function claimDailyQuest(entries, instanceId) {
  if (!Array.isArray(entries)) return { ok: false, entries: [], reward: 0 };
  const index = entries.findIndex(quest => quest?.instanceId === instanceId);
  const quest = entries[index];
  if (!quest || quest.claimed || quest.progress < quest.goal) return { ok: false, entries, reward: 0 };
  const nextEntries = entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, claimed: true } : entry);
  return { ok: true, entries: nextEntries, reward: Math.max(0, Number(quest.reward) || 0), quest: nextEntries[index] };
}
