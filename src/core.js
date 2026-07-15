import { BAITS, FISH, FURNITURE, MILESTONES, QUEST_TEMPLATES, RARITY, RODS, TIMES } from "./data.js";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "atlas-of-fins.save";
export const BACKUP_KEY = "atlas-of-fins.backup";

const objectFrom = (items, value = 0) => Object.fromEntries(items.map(item => [item.id, typeof value === "function" ? value(item) : value]));

export function createInitialState() {
  return {
    version: SAVE_VERSION,
    money: 120,
    timeIndex: 0,
    weather: "sunny",
    day: 1,
    elapsed: 0,
    ownedRods: ["wood"],
    equippedRod: "wood",
    baitAmounts: { ...objectFrom(BAITS), bread: 8 },
    equippedBait: "bread",
    ownedFurniture: ["sleeping_bag"],
    placedFurniture: { sleep: "sleeping_bag", wall: null, table: null, light: null, corner: null },
    discovered: {},
    catchInventory: [],
    completedMilestones: [],
    completedTutorial: false,
    tutorialStep: 0,
    currentQuests: createDailyQuests(1),
    questHistory: {},
    totalSold: 0,
    totalCaught: 0,
    selectedSpot: "shore",
    settings: { sound: true, reducedMotion: false },
    lastSavedAt: null
  };
}

export function createDailyQuests(day) {
  const offset = (day - 1) % QUEST_TEMPLATES.length;
  return [0, 1, 3].map((step, index) => {
    const template = QUEST_TEMPLATES[(offset + step) % QUEST_TEMPLATES.length];
    return { ...template, instanceId: `${day}-${index}-${template.id}`, progress: 0, claimed: false };
  });
}

export function migrateState(raw) {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;
  const merged = { ...base, ...raw, version: SAVE_VERSION };
  merged.baitAmounts = { ...base.baitAmounts, ...(raw.baitAmounts || {}) };
  merged.placedFurniture = { ...base.placedFurniture, ...(raw.placedFurniture || {}) };
  merged.settings = { ...base.settings, ...(raw.settings || {}) };
  merged.discovered = raw.discovered || {};
  merged.catchInventory = Array.isArray(raw.catchInventory) ? raw.catchInventory : [];
  merged.currentQuests = Array.isArray(raw.currentQuests) && raw.currentQuests.length ? raw.currentQuests : createDailyQuests(merged.day);
  merged.money = Math.max(0, Number(merged.money) || 0);
  return merged;
}

export function discoveredCount(state) {
  return Object.keys(state.discovered).length;
}

export function isUnlocked(item, state) {
  if (!item.unlockDiscoveries) return true;
  return discoveredCount(state) >= item.unlockDiscoveries;
}

export function fishWeight(fish, state, spotId = state.selectedSpot, baitId = state.equippedBait) {
  if (!fish.spots.includes(spotId)) return 0;
  const rod = RODS.find(r => r.id === state.equippedRod) || RODS[0];
  const bait = BAITS.find(b => b.id === baitId) || BAITS[0];
  const currentTime = TIMES[state.timeIndex]?.id || "dawn";
  const rarityBase = { common: 10, uncommon: 4.2, rare: 0.85 }[fish.rarity];
  let weight = rarityBase;
  weight *= fish.times.includes(currentTime) ? 2.8 : 0.22;
  if (fish.weather === state.weather) weight *= 2.2;
  else if (fish.weather !== "any") weight *= 0.48;
  if (fish.baits.includes(baitId)) weight *= 2.65;
  if (bait.tags.some(tag => fish.tags.includes(tag) || tag === fish.rarity || tag === spotId)) weight *= 1.45;
  if (fish.rarity !== "common") weight *= 1 + rod.rareBonus;
  if (state.discovered[fish.id]?.count >= 4) weight *= 0.86;
  return Math.max(0, weight);
}

export function chooseFish(state, random = Math.random) {
  const candidates = FISH.map(fish => ({ fish, weight: fishWeight(fish, state) })).filter(entry => entry.weight > 0);
  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll <= 0) return entry.fish;
  }
  return candidates.at(-1)?.fish || FISH[0];
}

export function generateCatch(fish, random = Math.random) {
  const sizeRoll = Math.min(1, Math.max(0, (random() + random()) / 2));
  const length = fish.minLength + (fish.maxLength - fish.minLength) * sizeRoll;
  const weightCurve = Math.pow((length - fish.minLength) / Math.max(1, fish.maxLength - fish.minLength), 1.65);
  const weight = fish.minWeight + (fish.maxWeight - fish.minWeight) * weightCurve * (0.92 + random() * 0.16);
  const ratio = (length - fish.minLength) / (fish.maxLength - fish.minLength);
  const sizeTier = ratio >= .93 ? "record" : ratio >= .72 ? "large" : ratio < .25 ? "small" : "standard";
  const sizeMultiplier = { small: .8, standard: 1, large: 1.3, record: 1.7 }[sizeTier];
  const price = Math.round(fish.basePrice * RARITY[fish.rarity].multiplier * sizeMultiplier);
  return {
    uid: `${fish.id}-${Date.now()}-${Math.floor(random() * 100000)}`,
    fishId: fish.id,
    length: Math.round(length * 10) / 10,
    weight: Math.round(weight * 100) / 100,
    sizeTier,
    price,
    caughtAt: new Date().toISOString()
  };
}

export function recordCatch(state, caught, baitId = state.equippedBait) {
  const fish = FISH.find(item => item.id === caught.fishId);
  const prior = state.discovered[caught.fishId];
  const isNew = !prior;
  const isLengthRecord = !prior || caught.length > prior.bestLength;
  const isWeightRecord = !prior || caught.weight > prior.bestWeight;
  state.discovered[caught.fishId] = {
    count: (prior?.count || 0) + 1,
    firstCaught: prior?.firstCaught || caught.caughtAt,
    bestLength: Math.max(prior?.bestLength || 0, caught.length),
    bestWeight: Math.max(prior?.bestWeight || 0, caught.weight)
  };
  state.catchInventory.push(caught);
  state.totalCaught += 1;
  if (isNew) state.money += 35 + ({ common: 0, uncommon: 30, rare: 100 }[fish.rarity]);
  updateQuestProgress(state, { type: "catch", fish, caught, baitId });
  return { isNew, isLengthRecord, isWeightRecord };
}

export function sellCatches(state, uids) {
  const uidSet = new Set(uids);
  const sold = state.catchInventory.filter(item => uidSet.has(item.uid));
  const total = sold.reduce((sum, item) => sum + item.price, 0);
  state.catchInventory = state.catchInventory.filter(item => !uidSet.has(item.uid));
  state.money += total;
  state.totalSold += total;
  updateQuestProgress(state, { type: "sell", amount: total });
  return { sold: sold.length, total };
}

export function buyRod(state, rodId) {
  const rod = RODS.find(item => item.id === rodId);
  if (!rod || state.ownedRods.includes(rodId) || !isUnlocked(rod, state) || state.money < rod.price) return false;
  state.money -= rod.price;
  state.ownedRods.push(rodId);
  state.equippedRod = rodId;
  return true;
}

export function buyBait(state, baitId) {
  const bait = BAITS.find(item => item.id === baitId);
  if (!bait || !isUnlocked(bait, state) || state.money < bait.price) return false;
  state.money -= bait.price;
  state.baitAmounts[baitId] = (state.baitAmounts[baitId] || 0) + bait.amount;
  return true;
}

export function buyFurniture(state, furnitureId) {
  const item = FURNITURE.find(entry => entry.id === furnitureId);
  if (!item || state.ownedFurniture.includes(furnitureId) || item.milestone || !isUnlocked(item, state) || state.money < item.price) return false;
  state.money -= item.price;
  state.ownedFurniture.push(furnitureId);
  state.placedFurniture[item.slot] = item.id;
  return true;
}

export function updateQuestProgress(state, event) {
  for (const quest of state.currentQuests) {
    if (quest.claimed || quest.progress >= quest.goal) continue;
    let increment = 0;
    if (event.type === "catch") {
      if (quest.type === "rarity" && event.fish.rarity === quest.target) increment = 1;
      if (quest.type === "tag" && event.fish.tags.includes(quest.target)) increment = 1;
      if (quest.type === "bait" && event.baitId === quest.target) increment = 1;
      if (quest.type === "size" && ["large", "record"].includes(event.caught.sizeTier)) increment = 1;
    }
    if (event.type === "sell" && quest.type === "sell") increment = event.amount;
    quest.progress = Math.min(quest.goal, quest.progress + increment);
  }
}

export function claimQuest(state, instanceId) {
  const quest = state.currentQuests.find(item => item.instanceId === instanceId);
  if (!quest || quest.claimed || quest.progress < quest.goal) return false;
  quest.claimed = true;
  state.money += quest.reward;
  return true;
}

export function applyMilestones(state) {
  const count = discoveredCount(state);
  const unlocked = [];
  for (const milestone of MILESTONES) {
    if (count >= milestone.count && !state.completedMilestones.includes(milestone.count)) {
      state.completedMilestones.push(milestone.count);
      state.money += milestone.coins;
      const rewardFurniture = FURNITURE.find(item => item.milestone === milestone.count);
      if (rewardFurniture && !state.ownedFurniture.includes(rewardFurniture.id)) state.ownedFurniture.push(rewardFurniture.id);
      unlocked.push(milestone);
    }
  }
  return unlocked;
}

export function advanceTime(state, random = Math.random) {
  state.timeIndex = (state.timeIndex + 1) % TIMES.length;
  if (state.timeIndex === 0) {
    state.day += 1;
    state.weather = random() < .35 ? "rain" : "sunny";
    state.currentQuests = createDailyQuests(state.day);
  }
}

export function getTensionConfig(fish, rod) {
  const halfWidth = rod.tolerance / 2;
  const center = Math.min(.66, .47 + (fish.difficulty - .6) * .08);
  return { safeMin: Math.max(.18, center - halfWidth), safeMax: Math.min(.85, center + halfWidth), breakDelay: Math.max(.75, 1.7 - fish.difficulty * .45) };
}

export function fishById(id) { return FISH.find(item => item.id === id); }
export function rodById(id) { return RODS.find(item => item.id === id); }
export function baitById(id) { return BAITS.find(item => item.id === id); }
export function furnitureById(id) { return FURNITURE.find(item => item.id === id); }
