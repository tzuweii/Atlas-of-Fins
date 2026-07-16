import { ACHIEVEMENTS, AQUARIUM_DECORATIONS, BAITS, FISH, FURNITURE, MILESTONES, QUEST_TEMPLATES, RARITY, RODS, SPOTS, TIMES } from "./data.js";

export const SAVE_VERSION = 2;
export const SAVE_KEY = "atlas-of-fins.save";
export const BACKUP_KEY = "atlas-of-fins.backup";
export const DEFAULT_TITLE = "海灣旅人";

export const FAMILIARITY_LEVELS = [
  { id: "unknown", name: "未發現", minCount: 0 },
  { id: "encountered", name: "初次相遇", minCount: 1 },
  { id: "notes", name: "生態筆記", minCount: 3 },
  { id: "familiar", name: "熟悉", minCount: 5 },
  { id: "mastered", name: "精通", minCount: 10 }
];

export const SHIMMER_CONFIG = {
  baseChance: .02,
  recordBonus: .02,
  masteryBonus: .01,
  maxChance: .05,
  priceMultiplier: 2,
  researchReward: 75,
  pity: 30,
  masteredPity: 20
};

const objectFrom = (items, value = 0) => Object.fromEntries(items.map(item => [item.id, typeof value === "function" ? value(item) : value]));
const isKnownId = (items, id) => items.some(item => item.id === id);
const uniqueKnownIds = (values, items) => [...new Set(Array.isArray(values) ? values.filter(id => isKnownId(items, id)) : [])];
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const nonNegativeNumber = value => Math.max(0, Number(value) || 0);

function normalizeCatchContext(raw) {
  const context = raw && typeof raw === "object" ? raw : {};
  return {
    spotId: isKnownId(SPOTS, context.spotId) ? context.spotId : null,
    timeId: isKnownId(TIMES, context.timeId) ? context.timeId : null,
    weather: ["sunny", "rain"].includes(context.weather) ? context.weather : null,
    baitId: isKnownId(BAITS, context.baitId) ? context.baitId : null,
    rodId: isKnownId(RODS, context.rodId) ? context.rodId : null,
    day: Number.isFinite(Number(context.day)) ? Math.max(1, Math.floor(Number(context.day))) : null
  };
}

function migrateCatch(raw) {
  if (!raw || typeof raw !== "object" || !isKnownId(FISH, raw.fishId)) return null;
  return {
    ...raw,
    uid: typeof raw.uid === "string" && raw.uid ? raw.uid : `${raw.fishId}-legacy-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    fishId: raw.fishId,
    length: nonNegativeNumber(raw.length),
    weight: nonNegativeNumber(raw.weight),
    sizeTier: ["small", "standard", "large", "record"].includes(raw.sizeTier) ? raw.sizeTier : "standard",
    variant: raw.variant === "shimmer" ? "shimmer" : "normal",
    price: Math.round(nonNegativeNumber(raw.price)),
    caughtAt: safeDate(raw.caughtAt),
    context: normalizeCatchContext(raw.context)
  };
}

function migrateDiscovery(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  const shimmerCount = Math.max(0, Math.floor(Number(record.shimmerCount) || 0));
  return {
    count: Math.max(0, Math.floor(Number(record.count) || 0)),
    firstCaught: safeDate(record.firstCaught),
    lastCaught: safeDate(record.lastCaught) || safeDate(record.firstCaught),
    bestLength: nonNegativeNumber(record.bestLength),
    bestWeight: nonNegativeNumber(record.bestWeight),
    spots: uniqueKnownIds(record.spots, SPOTS),
    times: uniqueKnownIds(record.times, TIMES),
    weathers: [...new Set(Array.isArray(record.weathers) ? record.weathers.filter(value => ["sunny", "rain"].includes(value)) : [])],
    caughtShimmer: Boolean(record.caughtShimmer || shimmerCount > 0),
    shimmerCount,
    shimmerPity: Math.max(0, Math.floor(Number(record.shimmerPity) || 0))
  };
}

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
    aquarium: { fish: [] },
    achievements: {},
    unlockedTitles: [DEFAULT_TITLE],
    equippedTitle: DEFAULT_TITLE,
    unlockedAquariumDecor: [],
    aquariumDecoration: null,
    completedMilestones: [],
    completedTutorial: false,
    tutorialStep: 0,
    currentQuests: createDailyQuests(1),
    questHistory: {},
    totalSold: 0,
    totalCaught: 0,
    recordCatches: 0,
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
  merged.discovered = Object.fromEntries(Object.entries(raw.discovered || {})
    .filter(([fishId]) => isKnownId(FISH, fishId))
    .map(([fishId, record]) => [fishId, migrateDiscovery(record)])
    .filter(([, record]) => record.count > 0));
  const migratedInventory = (Array.isArray(raw.catchInventory) ? raw.catchInventory : []).map(migrateCatch).filter(Boolean);
  const migratedAquarium = (Array.isArray(raw.aquarium?.fish) ? raw.aquarium.fish : []).map(migrateCatch).filter(Boolean);
  const aquariumUids = new Set();
  merged.aquarium = {
    ...base.aquarium,
    ...(raw.aquarium && typeof raw.aquarium === "object" ? raw.aquarium : {}),
    fish: migratedAquarium.filter(caught => {
      if (aquariumUids.has(caught.uid)) return false;
      aquariumUids.add(caught.uid);
      return true;
    })
  };
  const overflow = merged.aquarium.fish.splice(getAquariumCapacity(merged));
  const specimenUids = new Set(merged.aquarium.fish.map(caught => caught.uid));
  merged.catchInventory = [...migratedInventory, ...overflow].filter(caught => {
    if (specimenUids.has(caught.uid)) return false;
    specimenUids.add(caught.uid);
    return true;
  });
  merged.achievements = Object.fromEntries(Object.entries(raw.achievements && typeof raw.achievements === "object" ? raw.achievements : {})
    .filter(([id, entry]) => ACHIEVEMENTS.some(item => item.id === id) && entry && typeof entry === "object")
    .map(([id, entry]) => [id, { completedAt: safeDate(entry.completedAt) || new Date().toISOString(), claimed: Boolean(entry.claimed) }]));
  const validTitles = new Set([DEFAULT_TITLE, ...ACHIEVEMENTS.filter(item => item.reward.type === "title").map(item => item.reward.value)]);
  const validDecor = new Set(AQUARIUM_DECORATIONS.map(item => item.id));
  merged.unlockedTitles = [...new Set([DEFAULT_TITLE, ...(Array.isArray(raw.unlockedTitles) ? raw.unlockedTitles.filter(title => validTitles.has(title)) : [])])];
  merged.unlockedAquariumDecor = [...new Set(Array.isArray(raw.unlockedAquariumDecor) ? raw.unlockedAquariumDecor.filter(id => validDecor.has(id)) : [])];
  for (const achievement of ACHIEVEMENTS) {
    if (!merged.achievements[achievement.id]?.claimed) continue;
    if (achievement.reward.type === "title" && !merged.unlockedTitles.includes(achievement.reward.value)) merged.unlockedTitles.push(achievement.reward.value);
    if (achievement.reward.type === "aquariumDecor" && !merged.unlockedAquariumDecor.includes(achievement.reward.value)) merged.unlockedAquariumDecor.push(achievement.reward.value);
  }
  merged.equippedTitle = merged.unlockedTitles.includes(raw.equippedTitle) ? raw.equippedTitle : base.equippedTitle;
  merged.aquariumDecoration = merged.unlockedAquariumDecor.includes(raw.aquariumDecoration) ? raw.aquariumDecoration : null;
  merged.currentQuests = Array.isArray(raw.currentQuests) && raw.currentQuests.length ? raw.currentQuests : createDailyQuests(merged.day);
  merged.money = Math.max(0, Number(merged.money) || 0);
  merged.totalSold = nonNegativeNumber(merged.totalSold);
  const recordedCatchTotal = Object.values(merged.discovered).reduce((sum, record) => sum + record.count, 0);
  merged.totalCaught = Math.max(Math.floor(nonNegativeNumber(merged.totalCaught)), recordedCatchTotal);
  const heldRecordCatches = [...merged.catchInventory, ...merged.aquarium.fish].filter(caught => caught.sizeTier === "record").length;
  merged.recordCatches = Math.max(Math.floor(nonNegativeNumber(merged.recordCatches)), heldRecordCatches);
  evaluateAchievements(merged);
  return merged;
}

export function discoveredCount(state) {
  return Object.keys(state.discovered).length;
}

export function getAquariumCapacity(state) {
  const count = discoveredCount(state);
  if (count >= 20) return 10;
  if (count >= 15) return 8;
  if (count >= 10) return 5;
  if (count >= 5) return 3;
  return 0;
}

export function getFamiliarity(count) {
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));
  let index = FAMILIARITY_LEVELS.findLastIndex(level => safeCount >= level.minCount);
  if (index < 0) index = 0;
  const level = FAMILIARITY_LEVELS[index];
  const next = FAMILIARITY_LEVELS[index + 1] || null;
  return {
    ...level,
    count: safeCount,
    nextCount: next?.minCount ?? null,
    remaining: next ? Math.max(0, next.minCount - safeCount) : 0
  };
}

export function getAchievementProgress(state, achievementOrId) {
  const achievement = typeof achievementOrId === "string" ? ACHIEVEMENTS.find(item => item.id === achievementOrId) : achievementOrId;
  if (!achievement) return { current: 0, goal: 0, complete: false };
  const records = Object.values(state.discovered || {});
  let current = 0;
  if (achievement.type === "totalCaught") current = Math.max(0, Number(state.totalCaught) || 0);
  if (achievement.type === "species") current = discoveredCount(state);
  if (achievement.type === "familiarSpecies") current = records.filter(record => (record.count || 0) >= 5).length;
  if (achievement.type === "masteredSpecies") current = records.filter(record => (record.count || 0) >= 10).length;
  if (achievement.type === "recordCatches") current = Math.max(0, Number(state.recordCatches) || 0);
  if (achievement.type === "shimmerSpecies") current = records.filter(record => record.caughtShimmer).length;
  if (achievement.type === "aquariumCount") current = Array.isArray(state.aquarium?.fish) ? state.aquarium.fish.length : 0;
  if (achievement.type === "uniqueTimes") current = new Set(records.flatMap(record => Array.isArray(record.times) ? record.times : [])).size;
  current = Math.max(0, Math.floor(current));
  return { current, goal: achievement.goal, complete: current >= achievement.goal };
}

export function evaluateAchievements(state, completedAt = new Date().toISOString()) {
  if (!state.achievements || typeof state.achievements !== "object") state.achievements = {};
  const completed = [];
  for (const achievement of ACHIEVEMENTS) {
    if (state.achievements[achievement.id] || !getAchievementProgress(state, achievement).complete) continue;
    state.achievements[achievement.id] = { completedAt, claimed: false };
    completed.push(achievement);
  }
  return completed;
}

export function getUnclaimedAchievementCount(state) {
  return ACHIEVEMENTS.filter(achievement => state.achievements?.[achievement.id] && !state.achievements[achievement.id].claimed).length;
}

export function claimAchievement(state, achievementId) {
  const achievement = ACHIEVEMENTS.find(item => item.id === achievementId);
  const entry = state.achievements?.[achievementId];
  if (!achievement || !entry || entry.claimed) return { ok: false, reason: "unavailable" };
  entry.claimed = true;
  const reward = achievement.reward;
  if (reward.type === "coins") state.money += reward.amount;
  if (reward.type === "title") {
    if (!Array.isArray(state.unlockedTitles)) state.unlockedTitles = [DEFAULT_TITLE];
    if (!state.unlockedTitles.includes(reward.value)) state.unlockedTitles.push(reward.value);
  }
  if (reward.type === "aquariumDecor") {
    if (!Array.isArray(state.unlockedAquariumDecor)) state.unlockedAquariumDecor = [];
    if (!state.unlockedAquariumDecor.includes(reward.value)) state.unlockedAquariumDecor.push(reward.value);
    state.aquariumDecoration = reward.value;
  }
  return { ok: true, achievement, reward };
}

export function equipTitle(state, title) {
  if (!Array.isArray(state.unlockedTitles) || !state.unlockedTitles.includes(title)) return false;
  state.equippedTitle = title;
  return true;
}

export function setAquariumDecoration(state, decorationId) {
  if (decorationId === null) { state.aquariumDecoration = null; return true; }
  if (!Array.isArray(state.unlockedAquariumDecor) || !state.unlockedAquariumDecor.includes(decorationId)) return false;
  state.aquariumDecoration = decorationId;
  return true;
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

export function rollVariant(fishId, sizeTier, state, random = Math.random) {
  const record = state?.discovered?.[fishId];
  const mastered = getFamiliarity(record?.count || 0).id === "mastered";
  const pityLimit = mastered ? SHIMMER_CONFIG.masteredPity : SHIMMER_CONFIG.pity;
  const pity = Math.max(0, Math.floor(Number(record?.shimmerPity) || 0));
  const guaranteed = pity >= pityLimit - 1;
  const chance = Math.min(SHIMMER_CONFIG.maxChance,
    SHIMMER_CONFIG.baseChance
      + (sizeTier === "record" ? SHIMMER_CONFIG.recordBonus : 0)
      + (mastered ? SHIMMER_CONFIG.masteryBonus : 0));
  return {
    variant: guaranteed || random() < chance ? "shimmer" : "normal",
    chance,
    guaranteed,
    pityLimit
  };
}

export function generateCatch(fish, contextOrRandom = {}, stateOrRandom = null, random = Math.random) {
  const context = typeof contextOrRandom === "function" ? {} : contextOrRandom;
  let catchState = stateOrRandom;
  if (typeof contextOrRandom === "function") {
    random = contextOrRandom;
    catchState = null;
  } else if (typeof stateOrRandom === "function") {
    random = stateOrRandom;
    catchState = null;
  }
  const sizeRoll = Math.min(1, Math.max(0, (random() + random()) / 2));
  const length = fish.minLength + (fish.maxLength - fish.minLength) * sizeRoll;
  const weightCurve = Math.pow((length - fish.minLength) / Math.max(1, fish.maxLength - fish.minLength), 1.65);
  const weight = fish.minWeight + (fish.maxWeight - fish.minWeight) * weightCurve * (0.92 + random() * 0.16);
  const ratio = (length - fish.minLength) / (fish.maxLength - fish.minLength);
  const sizeTier = ratio >= .93 ? "record" : ratio >= .72 ? "large" : ratio < .25 ? "small" : "standard";
  const sizeMultiplier = { small: .8, standard: 1, large: 1.3, record: 1.7 }[sizeTier];
  const variant = catchState ? rollVariant(fish.id, sizeTier, catchState, random).variant : "normal";
  const basePrice = Math.round(fish.basePrice * RARITY[fish.rarity].multiplier * sizeMultiplier);
  const price = basePrice * (variant === "shimmer" ? SHIMMER_CONFIG.priceMultiplier : 1);
  return {
    uid: `${fish.id}-${Date.now()}-${Math.floor(random() * 100000)}`,
    fishId: fish.id,
    length: Math.round(length * 10) / 10,
    weight: Math.round(weight * 100) / 100,
    sizeTier,
    variant,
    price,
    caughtAt: new Date().toISOString(),
    context: normalizeCatchContext(context)
  };
}

export function recordCatch(state, caught, baitId = state.equippedBait) {
  const fish = FISH.find(item => item.id === caught.fishId);
  const prior = state.discovered[caught.fishId];
  const priorFamiliarity = getFamiliarity(prior?.count || 0);
  const isNew = !prior;
  const isFirstShimmer = caught.variant === "shimmer" && !prior?.caughtShimmer;
  const isLengthRecord = !prior || caught.length > prior.bestLength;
  const isWeightRecord = !prior || caught.weight > prior.bestWeight;
  const context = normalizeCatchContext(caught.context);
  caught.context = context;
  state.discovered[caught.fishId] = {
    count: (prior?.count || 0) + 1,
    firstCaught: prior?.firstCaught || caught.caughtAt,
    lastCaught: caught.caughtAt,
    bestLength: Math.max(prior?.bestLength || 0, caught.length),
    bestWeight: Math.max(prior?.bestWeight || 0, caught.weight),
    spots: uniqueKnownIds([...(prior?.spots || []), context.spotId], SPOTS),
    times: uniqueKnownIds([...(prior?.times || []), context.timeId], TIMES),
    weathers: [...new Set([...(prior?.weathers || []), context.weather].filter(value => ["sunny", "rain"].includes(value)))],
    caughtShimmer: Boolean(prior?.caughtShimmer || caught.variant === "shimmer"),
    shimmerCount: (prior?.shimmerCount || 0) + (caught.variant === "shimmer" ? 1 : 0),
    shimmerPity: caught.variant === "shimmer" ? 0 : (prior?.shimmerPity || 0) + 1
  };
  const familiarity = getFamiliarity(state.discovered[caught.fishId].count);
  state.catchInventory.push(caught);
  state.totalCaught += 1;
  if (caught.sizeTier === "record") state.recordCatches = (state.recordCatches || 0) + 1;
  if (isNew) state.money += 35 + ({ common: 0, uncommon: 30, rare: 100 }[fish.rarity]);
  if (isFirstShimmer) state.money += SHIMMER_CONFIG.researchReward;
  updateQuestProgress(state, { type: "catch", fish, caught, baitId: context.baitId || baitId });
  const completedAchievements = evaluateAchievements(state);
  return {
    isNew,
    isFirstShimmer,
    isLengthRecord,
    isWeightRecord,
    familiarity,
    familiarityChanged: familiarity.id !== priorFamiliarity.id,
    completedAchievements,
    record: state.discovered[caught.fishId]
  };
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

function aquariumFish(state) {
  if (!state.aquarium || typeof state.aquarium !== "object") state.aquarium = { fish: [] };
  if (!Array.isArray(state.aquarium.fish)) state.aquarium.fish = [];
  return state.aquarium.fish;
}

export function moveCatchToAquarium(state, uid) {
  const catchIndex = state.catchInventory.findIndex(item => item.uid === uid);
  if (catchIndex < 0) return { ok: false, reason: "missing" };
  const capacity = getAquariumCapacity(state);
  if (!capacity) return { ok: false, reason: "locked" };
  const displayed = aquariumFish(state);
  if (displayed.length >= capacity) return { ok: false, reason: "full" };
  const [caught] = state.catchInventory.splice(catchIndex, 1);
  displayed.push(caught);
  return { ok: true, caught, index: displayed.length - 1, completedAchievements: evaluateAchievements(state) };
}

export function removeFishFromAquarium(state, uid) {
  const displayed = aquariumFish(state);
  const aquariumIndex = displayed.findIndex(item => item.uid === uid);
  if (aquariumIndex < 0) return { ok: false, reason: "missing" };
  const [caught] = displayed.splice(aquariumIndex, 1);
  state.catchInventory.push(caught);
  return { ok: true, caught };
}

export function replaceAquariumFish(state, catchUid, aquariumUid) {
  if (!getAquariumCapacity(state)) return { ok: false, reason: "locked" };
  const catchIndex = state.catchInventory.findIndex(item => item.uid === catchUid);
  if (catchIndex < 0) return { ok: false, reason: "missing-catch" };
  const displayed = aquariumFish(state);
  const aquariumIndex = displayed.findIndex(item => item.uid === aquariumUid);
  if (aquariumIndex < 0) return { ok: false, reason: "missing-aquarium" };
  const incoming = state.catchInventory[catchIndex];
  const outgoing = displayed[aquariumIndex];
  state.catchInventory.splice(catchIndex, 1, outgoing);
  displayed.splice(aquariumIndex, 1, incoming);
  return { ok: true, incoming, outgoing, index: aquariumIndex, completedAchievements: evaluateAchievements(state) };
}

export function swapAquariumFish(state, fromIndex, toIndex) {
  const displayed = aquariumFish(state);
  const from = Number(fromIndex), to = Number(toIndex);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= displayed.length || to >= displayed.length) {
    return { ok: false, reason: "invalid-index" };
  }
  if (from === to) return { ok: true, unchanged: true };
  [displayed[from], displayed[to]] = [displayed[to], displayed[from]];
  return { ok: true, from, to };
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
