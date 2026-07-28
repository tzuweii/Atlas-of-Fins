import {
  ACHIEVEMENTS, AQUARIUM_CAPACITY_MILESTONES, AQUARIUM_DECORATIONS, AUTO_FISHING_EQUIPMENT, BAITS, BAY_EVENTS,
  BASE_APPEARANCE_BUDGETS, CHENGYE_ID, DAILY_GOAL_TEMPLATES, FISH, FISH_APPEARANCE_BONUSES,
  FISH_RARITY_ORDER, FURNITURE, HIGH_TIER_RARITIES, LUMINOUS_ARCHIPELAGO_ID, MILESTONES, RARITY,
  REGIONS, RESEARCH_NODES, RODS, ROUTES, SHIPS, SHIP_FURNITURE, SLEEPING_TIDE_BAY_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
  SPOTS, TIDEGLOW_SOURCES, TIMES,
  cascadeHighTierSplit, fishCanAppearAtSpot, getFishHabitat, getRegionFishingSpots,
  isRegionAvailable, observationSubjectById, residentStorySceneById, shipFurnitureById as findShipFurnitureById
} from "./data.js";
import {
  BACKUP_KEY, DEV_BACKUP_KEY, DEV_SAVE_KEY, DEV_TEMP_SAVE_KEY, SAVE_KEY, SAVE_VERSION, TEMP_SAVE_KEY
} from "./persistence/save-schema.js";
import {
  applyDailyGoalProgress, claimCompletedDailyGoals, claimDailyGoal, createDailyBoard,
  createDailyGoalEntry, createDailyQuests, normalizeDailyBoard
} from "./systems/daily-board.js";
import {
  acceptResidentCommission as acceptResidentCommissionState,
  applyResidentCommissionProgress, clearResidentCommissionHistory, completeActiveResidentCommission,
  createResidentCommissionState, deliverResidentCommission as deliverResidentCommissionState,
  dropResidentCommission as dropResidentCommissionState, normalizeResidentCommissionState,
  refreshResidentOffers, setResidentOffer
} from "./systems/resident-commissions.js";
import {
  createDeveloperWorldState, createInitialWorldState, normalizeWorldState, recordRegionalDiscovery
} from "./systems/world-state.js";
import {
  CHART_VIEW_LIMITS, canBeginChartRoute, createDefaultChartView, normalizeChartView,
  panChartView, requestChartRoute, zoomChartView
} from "./systems/chart-view.js";
import {
  DEVELOPER_TRAVEL_SCALES, FAMILIAR_TRAVEL_DURATION_MS, FIRST_TRAVEL_DURATION_MS,
  advanceWorldTravel, beginWorldTravel, dockWorldAtDestination, getRouteTravelDurationMs,
  getTravelStatus, normalizeTravelScale
} from "./systems/travel.js";
import {
  createDeveloperObservationState, createObservationState, getObservationHint, normalizeObservationState,
  recordObservationSubject, visitObservationSpot
} from "./systems/observations.js";
import {
  completeRegionResearchForDeveloper, evaluateResearchProgress, getRegionResearchStatus
} from "./systems/research.js";
import {
  acceptResidentStory as acceptResidentStoryState, applyResidentStoryProgress,
  completeResidentStory as completeResidentStoryState, createResidentStoryState,
  getResidentStoryStatus, normalizeResidentStoryState, resetResidentStory
} from "./systems/resident-stories.js";
import { normalizeDisplaySettings } from "./systems/accessibility.js";
import {
  TUTORIAL_TOTAL_STEPS, TUTORIAL_VERSION, normalizeTutorialProgress
} from "./systems/tutorial.js";
import {
  consumeGameEvent, createGameEventState, enqueueGameEvent, normalizeGameEventState
} from "./systems/game-events.js";
import {
  adjustDeveloperTideglow, applyTideglowEvent, createTideglowState, normalizeTideglowState
} from "./systems/tideglow.js";
import {
  SHIP_CATALOG_VERSION, STARTER_SHIP_ID as SHIP_STARTER_ID, activeShip, activeShipSpeed,
  createShipsState, developerRevealAllShips as revealAllShipsForDeveloper,
  developerSetShipOwned as setShipOwnedForDeveloper, developerSetShipSpeed as setShipSpeedForDeveloper,
  getShipPurchaseState, normalizeShipsState, purchaseShip as purchaseShipState,
  revealEligibleShips, switchShip as switchShipState
} from "./systems/ships.js";
import {
  SHIP_INTERIOR_VERSION, activeShipFurnitureCatalog, collectInvalidInteriorReferences,
  developerClearShipFurniture as clearShipFurnitureForDeveloper,
  developerFillShipFurniture as fillShipFurnitureForDeveloper,
  developerResetShipSlots as resetShipSlotsForDeveloper,
  developerSetShipLighting as setShipLightingForDeveloper,
  grantShipFurniture, placeShipFurniture as placeShipFurnitureState,
  purchaseShipFurniture, shipInterior, syncLegacyStarterFurniture
} from "./systems/ship-interiors.js";
import {
  JOURNAL_VERSION, acknowledgeJournalNotices, applyJournalEvent, createJournalState,
  getJournalCategories, getJournalEntries, getJournalEntry, getJournalUnreadCount,
  markJournalEntriesRead, normalizeJournalState, sealJournalDay, syncJournalUnlocks
} from "./systems/journal.js";
import {
  AUTO_FISHING_VERSION, acknowledgeAutoFishingSummary as acknowledgeAutoSummaryState,
  autoFishingSummaryView, cancelAutoFishingCloseMarker as cancelAutoCloseState,
  createAutoFishingState, getAutoFishingFishPool, getAutoFishingPurchaseState,
  getEligibleAutoFishingBaits, getEligibleAutoFishingSpots,
  markAutoFishingPageClosed as markAutoClosedState, normalizeAutoFishingState,
  purchaseAutoFishingEquipment as purchaseAutoEquipmentState,
  resetAutoFishingForDeveloper as resetAutoFishingStateForDeveloper,
  settleAutoFishingOnOpen as settleAutoFishingStateOnOpen,
  startAutoFishingSession as startAutoFishingSessionState,
  stopAutoFishingSession as stopAutoFishingSessionState, syncAutoFishingShip
} from "./systems/auto-fishing.js";

export {
  BACKUP_KEY, DEV_BACKUP_KEY, DEV_SAVE_KEY, DEV_TEMP_SAVE_KEY, SAVE_KEY, SAVE_VERSION, TEMP_SAVE_KEY,
  AUTO_FISHING_EQUIPMENT, AUTO_FISHING_VERSION, SHIPS, SHIP_FURNITURE, TIDEGLOW_SOURCES,
  activeShip, activeShipSpeed, activeShipFurnitureCatalog, autoFishingSummaryView,
  collectInvalidInteriorReferences, createDailyQuests, getShipPurchaseState, shipInterior,
  acknowledgeJournalNotices, getJournalCategories, getJournalEntries, getJournalEntry,
  getJournalUnreadCount, markJournalEntriesRead, syncJournalUnlocks,
  CHART_VIEW_LIMITS, canBeginChartRoute, createDefaultChartView, createDeveloperWorldState,
  createInitialWorldState, DEVELOPER_TRAVEL_SCALES, FAMILIAR_TRAVEL_DURATION_MS,
  FIRST_TRAVEL_DURATION_MS, getAutoFishingFishPool, getAutoFishingPurchaseState,
  getEligibleAutoFishingBaits, getEligibleAutoFishingSpots, getObservationHint,
  getRegionResearchStatus, getResidentStoryStatus,
  getRouteTravelDurationMs, getTravelStatus, normalizeChartView,
  normalizeTravelScale, normalizeWorldState, panChartView, requestChartRoute, zoomChartView
};
export const DEFAULT_TITLE = "海灣旅人";
export const STARTER_SHIP_ID = SHIP_STARTER_ID;

function createShipShell(ownedFurniture = ["sleeping_bag"], placedFurniture = { sleep: "sleeping_bag", wall: null, table: null, light: null, corner: null }) {
  return createShipsState({
    ownedFurnitureIds: [...ownedFurniture],
    placedFurniture: { ...placedFurniture },
    lightingId: "default",
    aquariumFrameId: "default"
  });
}

function createJournalShell() {
  return createJournalState();
}

function createAutoFishingShell() {
  return createAutoFishingState();
}

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

export function getProgressAvailabilityContext(state) {
  const availableRegionIds = [...new Set([
    ...(state?.world?.visitedRegionIds || []),
    state?.world?.currentRegionId
  ].filter(isRegionAvailable))];
  const availableSpotIds = SPOTS.filter(spot => availableRegionIds.includes(spot.regionId)
    && (!spot.requires || state?.ownedRods?.includes(spot.requires))).map(spot => spot.id);
  const availableBaitIds = BAITS.filter(bait => isUnlocked(bait, state)).map(bait => bait.id);
  const availableFishIds = FISH.filter(fish => fish.habitats?.some(habitat => availableRegionIds.includes(habitat.regionId)
    && habitat.spotIds.some(spotId => availableSpotIds.includes(spotId)))).map(fish => fish.id);
  return { availableRegionIds, availableSpotIds, availableBaitIds, availableFishIds, fishCatalog: FISH };
}

export function applyStructuredReward(state, reward) {
  if (reward?.type === "coins") {
    const amount = Math.max(0, Number(reward.amount) || 0);
    state.money += amount;
    return amount > 0;
  }
  if (reward?.type === "bait" && BAITS.some(bait => bait.id === reward.baitId)) {
    const amount = Math.max(0, Math.floor(Number(reward.amount) || 0));
    state.baitAmounts[reward.baitId] = (state.baitAmounts[reward.baitId] || 0) + amount;
    return amount > 0;
  }
  return false;
}

function normalizeCatchContext(raw) {
  const context = raw && typeof raw === "object" ? raw : {};
  return {
    regionId: isRegionAvailable(context.regionId) ? context.regionId : null,
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
  const count = Math.max(0, Math.floor(Number(record.count) || 0));
  const autoCount = Math.min(count, Math.max(0, Math.floor(Number(record.autoCount) || 0)));
  const manualCount = Number.isFinite(Number(record.manualCount))
    ? Math.min(count, Math.max(0, Math.floor(Number(record.manualCount))))
    : Math.max(0, count - autoCount);
  return {
    count,
    manualCount,
    autoCount,
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

function migrateBayEventHistory(raw) {
  const history = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(Object.entries(history)
    .filter(([eventId, entry]) => isKnownId(BAY_EVENTS, eventId) && entry && typeof entry === "object")
    .map(([eventId, entry]) => [eventId, {
      completions: Math.max(0, Math.floor(Number(entry.completions) || 0)),
      firstCompletedAt: safeDate(entry.firstCompletedAt),
      lastCompletedDay: Number.isFinite(Number(entry.lastCompletedDay)) ? Math.max(1, Math.floor(Number(entry.lastCompletedDay))) : null
    }])
    .filter(([, entry]) => entry.completions > 0));
}

function migrateBayEvent(raw, day, regionId = SLEEPING_TIDE_BAY_ID) {
  const scheduled = getScheduledBayEvent(day, regionId);
  const persisted = raw && typeof raw === "object" && Number(raw.day) === day
    ? BAY_EVENTS.find(event => event.id === raw.eventId && event.regionId === regionId)
    : null;
  const event = persisted || scheduled;
  if (!event) return null;
  const base = createBayEventState(day, event.id);
  if (!persisted) return base;
  const progress = Math.min(event.goal, Math.max(0, Math.floor(Number(raw.progress) || 0)));
  return {
    ...base,
    progress,
    completedAt: progress >= event.goal ? safeDate(raw.completedAt) : null,
    rewardLabel: progress >= event.goal && typeof raw.rewardLabel === "string" ? raw.rewardLabel : null
  };
}

export function getScheduledBayEvent(day, regionId = SLEEPING_TIDE_BAY_ID) {
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  const regionEvents = BAY_EVENTS.filter(event => event.regionId === regionId);
  if (!regionEvents.length || safeDay % 2 === 0) return null;
  return regionEvents[Math.floor((safeDay - 1) / 2) % regionEvents.length] || null;
}

export function createBayEventState(day, eventId = null, regionId = SLEEPING_TIDE_BAY_ID) {
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  const event = eventId ? BAY_EVENTS.find(item => item.id === eventId) : getScheduledBayEvent(safeDay, regionId);
  return event ? {
    instanceId: `${safeDay}-${event.id}`,
    eventId: event.id,
    day: safeDay,
    progress: 0,
    completedAt: null,
    rewardLabel: null
  } : null;
}

function createRegionEventStates(day) {
  return Object.fromEntries(REGIONS.filter(region => region.status === "available").map(region => [
    region.id,
    createBayEventState(day, null, region.id)
  ]));
}

export function getActiveBayEventState(state) {
  const regionId = state?.world?.currentRegionId || SLEEPING_TIDE_BAY_ID;
  const current = regionId === SLEEPING_TIDE_BAY_ID ? state?.bayEvent : state?.regionEvents?.[regionId];
  if (!current || Number(current.day) !== Number(state?.day)) return null;
  const event = BAY_EVENTS.find(entry => entry.id === current.eventId && entry.regionId === regionId);
  return event ? current : null;
}

export function getActiveBayEvent(state) {
  const current = getActiveBayEventState(state);
  return current ? BAY_EVENTS.find(entry => entry.id === current.eventId) || null : null;
}

function bayEventSpotIds(event) {
  return Array.isArray(event?.spotIds) ? event.spotIds : event?.spotId ? [event.spotId] : [];
}

export function isBayEventConditionActive(state, event = getActiveBayEvent(state)) {
  if (!event) return false;
  const timeId = TIMES[state.timeIndex]?.id || "dawn";
  const correctTime = !Array.isArray(event.timeIds) || !event.timeIds.length || event.timeIds.includes(timeId);
  const correctWeather = !Array.isArray(event.weatherIds) || !event.weatherIds.length || event.weatherIds.includes(state.weather);
  return correctTime && correctWeather;
}

export function applyBayEventWorldConditions(state) {
  const event = getActiveBayEvent(state);
  if (event?.forceWeather && ["sunny", "rain"].includes(event.forceWeather)) state.weather = event.forceWeather;
  return event;
}

export function getBayEventHint(state) {
  const event = getActiveBayEvent(state);
  const current = getActiveBayEventState(state);
  if (!event) return null;
  const progress = Math.min(event.goal, Math.max(0, Math.floor(Number(current.progress) || 0)));
  if (!current.completedAt && !isBayEventConditionActive(state, event)) return event.inactiveHint || event.description;
  return event.hints[Math.min(progress, event.hints.length - 1)] || event.description;
}

export function updateBayEventProgress(state, caught, completedAt = new Date().toISOString()) {
  const event = getActiveBayEvent(state);
  const current = getActiveBayEventState(state);
  if (!event || !current || current.completedAt) return { updated: false, event };
  const context = normalizeCatchContext(caught?.context);
  const correctTime = !Array.isArray(event.timeIds) || !event.timeIds.length || event.timeIds.includes(context.timeId);
  const correctWeather = !Array.isArray(event.weatherIds) || !event.weatherIds.length || event.weatherIds.includes(context.weather);
  if (context.day !== state.day || !bayEventSpotIds(event).includes(context.spotId) || !correctTime || !correctWeather || !event.fishIds.includes(caught?.fishId)) {
    return { updated: false, event };
  }
  current.progress = Math.min(event.goal, Math.max(0, Math.floor(Number(current.progress) || 0)) + 1);
  if (current.progress < event.goal) return { updated: true, completed: false, event, progress: current.progress };

  if (!state.bayEventHistory || typeof state.bayEventHistory !== "object") state.bayEventHistory = {};
  const prior = state.bayEventHistory[event.id];
  const firstCompletion = !prior?.completions;
  const reward = firstCompletion ? event.firstReward : event.repeatReward;
  current.completedAt = safeDate(completedAt) || new Date().toISOString();
  current.rewardLabel = reward.label;
  state.bayEventHistory[event.id] = {
    completions: (prior?.completions || 0) + 1,
    firstCompletedAt: prior?.firstCompletedAt || current.completedAt,
    lastCompletedDay: state.day
  };
  if (reward.type === "coins") state.money += reward.amount;
  if (reward.type === "title") {
    if (!Array.isArray(state.unlockedTitles)) state.unlockedTitles = [DEFAULT_TITLE];
    if (!state.unlockedTitles.includes(reward.value)) state.unlockedTitles.push(reward.value);
  }
  return { updated: true, completed: true, firstCompletion, event, progress: current.progress, reward };
}

export function createInitialState() {
  const bayEvent = createBayEventState(1);
  const regionEvents = createRegionEventStates(1);
  regionEvents[SLEEPING_TIDE_BAY_ID] = bayEvent;
  const state = {
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
    gameEvents: createGameEventState(),
    tideglow: createTideglowState(),
    ships: createShipShell(),
    journal: createJournalShell(),
    autoFishing: createAutoFishingShell(),
    discovered: {},
    catchInventory: [],
    aquarium: { fish: [] },
    achievements: {},
    unlockedTitles: [DEFAULT_TITLE],
    equippedTitle: DEFAULT_TITLE,
    unlockedAquariumDecor: [],
    aquariumDecoration: null,
    completedMilestones: [],
    tutorialVersion: TUTORIAL_VERSION,
    completedTutorial: false,
    tutorialStep: 0,
    tutorialCatchUid: null,
    dailyBoard: null,
    residentCommissions: null,
    observations: createObservationState(),
    residentStories: createResidentStoryState(),
    chartView: createDefaultChartView(),
    travelSettings: { developerDurationScale: 1 },
    world: createInitialWorldState(),
    bayEvent,
    regionEvents,
    bayEventHistory: {},
    totalSold: 0,
    totalCaught: 0,
    recordCatches: 0,
    selectedSpot: "shore",
    settings: normalizeDisplaySettings(),
    lastSavedAt: null
  };
  const availability = getProgressAvailabilityContext(state);
  state.dailyBoard = createDailyBoard(state.day, availability);
  state.residentCommissions = createResidentCommissionState(state.day, availability);
  state.journal = syncJournalUnlocks(state);
  return state;
}

export function createDeveloperState() {
  const state = createInitialState();
  const caughtAt = new Date().toISOString();
  const specimen = (fish, index, location) => {
    const habitat = fish.habitats[0];
    return ({
    uid: `developer-${location}-${fish.id}`,
    fishId: fish.id,
    length: fish.maxLength,
    weight: fish.maxWeight,
    sizeTier: "record",
    variant: index % 2 === 0 ? "shimmer" : "normal",
    price: Math.round(fish.basePrice * RARITY[fish.rarity].multiplier * 1.7 * (index % 2 === 0 ? SHIMMER_CONFIG.priceMultiplier : 1)),
    caughtAt,
    context: {
      spotId: habitat.spotIds[0],
      timeId: fish.preferredTimeIds[0] || "dawn",
      weather: fish.preferredWeatherIds[0] || "sunny",
      baitId: fish.baits[0],
      rodId: "farcast",
      regionId: habitat.regionId,
      day: 99
    }
  });
  };

  state.developerMode = true;
  state.tideglow = { ...state.tideglow, enabled: true, seenIntro: true };
  state.autoFishing = { ...createAutoFishingState(), owned: true, purchasedAt: caughtAt };
  state.money = 999999;
  state.day = 99;
  state.timeIndex = 3;
  state.bayEvent = createBayEventState(state.day);
  state.regionEvents = createRegionEventStates(state.day);
  state.regionEvents[SLEEPING_TIDE_BAY_ID] = state.bayEvent;
  state.ownedRods = RODS.map(item => item.id);
  state.equippedRod = "farcast";
  state.baitAmounts = objectFrom(BAITS, 999);
  state.equippedBait = "glow";
  state.ownedFurniture = FURNITURE.map(item => item.id);
  state.placedFurniture = Object.fromEntries(Object.keys(state.placedFurniture).map(slot => {
    const item = FURNITURE.findLast(entry => entry.slot === slot);
    return [slot, item?.id || null];
  }));
  state.discovered = Object.fromEntries(FISH.map(fish => [fish.id, {
    count: 10,
    manualCount: 10,
    autoCount: 0,
    firstCaught: caughtAt,
    lastCaught: caughtAt,
    bestLength: fish.maxLength,
    bestWeight: fish.maxWeight,
    spots: [...fish.spots],
    times: [...fish.preferredTimeIds],
    weathers: fish.preferredWeatherIds.length ? [...fish.preferredWeatherIds] : ["sunny", "rain"],
    caughtShimmer: true,
    shimmerCount: 1,
    shimmerPity: 0
  }]));
  state.catchInventory = FISH.slice(5).map((fish, index) => specimen(fish, index + 5, "inventory"));
  state.aquarium = { fish: FISH.slice(0, 5).map((fish, index) => specimen(fish, index, "aquarium")) };
  state.completedMilestones = MILESTONES.map(item => item.count);
  state.completedTutorial = true;
  state.tutorialVersion = TUTORIAL_VERSION;
  state.tutorialStep = TUTORIAL_TOTAL_STEPS;
  state.tutorialCatchUid = null;
  const availability = getProgressAvailabilityContext(state);
  state.dailyBoard = createDailyBoard(state.day, availability);
  state.dailyBoard.entries = state.dailyBoard.entries.map(entry => ({ ...entry, progress: entry.goal }));
  state.residentCommissions = createResidentCommissionState(state.day, availability);
  state.totalCaught = FISH.length * 10;
  state.totalSold = 10000;
  state.recordCatches = FISH.length;
  state.achievements = Object.fromEntries(ACHIEVEMENTS.map(item => [item.id, { completedAt: caughtAt, claimed: false }]));
  state.unlockedTitles = [...new Set([
    DEFAULT_TITLE,
    ...ACHIEVEMENTS.filter(item => item.reward.type === "title").map(item => item.reward.value),
    ...BAY_EVENTS.filter(item => item.firstReward.type === "title").map(item => item.firstReward.value)
  ])];
  state.equippedTitle = state.unlockedTitles.at(-1);
  state.unlockedAquariumDecor = AQUARIUM_DECORATIONS.map(item => item.id);
  state.aquariumDecoration = state.unlockedAquariumDecor[0] || null;
  state.selectedSpot = "deep";
  state.world = createDeveloperWorldState({ discoveredFishIds: Object.keys(state.discovered) });
  state.ships = normalizeShipsState({
    ...state.ships,
    activeShipId: "voyager_study",
    ownedShipIds: SHIPS.filter(ship => ship.status === "implemented").map(ship => ship.id),
    revealedShipIds: SHIPS.map(ship => ship.id),
    purchasedAtByShipId: {
      tidewhisper_residence: caughtAt,
      voyager_study: caughtAt
    }
  });
  for (const shipId of state.ships.ownedShipIds) fillShipFurnitureForDeveloper(state, shipId);
  syncLegacyStarterFurniture(state);
  state.observations = createDeveloperObservationState({ day: state.day, observedAt: caughtAt });
  for (const region of REGIONS) evaluateResearchProgress(state, region.id);
  state.journal = syncJournalUnlocks(state);
  state.settings.sound = false;
  return state;
}

function routeStoryCompleted(state, route) {
  if (route?.unlock?.type !== "resident-story") return true;
  const scene = residentStorySceneById(route.unlock.sceneId);
  return Boolean(scene && state.residentStories?.[scene.residentId]?.completedSceneIds?.includes(scene.id));
}

function routeWasAlreadyTraversed(state, route) {
  if (!route) return false;
  if (state.world?.completedRouteIds?.includes(route.id)) return true;
  const visited = new Set(state.world?.visitedRegionIds || []);
  return visited.has(route.fromRegionId) && visited.has(route.toRegionId);
}

export function isRouteUnlockedForState(state, routeId) {
  const route = ROUTES.find(entry => entry.id === routeId);
  if (!route || route.status !== "available" || !state.world?.unlockedRouteIds?.includes(routeId)) return false;
  if (state.developerMode) return true;
  const legacyReturnTrip = routeWasAlreadyTraversed(state, route) && state.world.currentRegionId === route.toRegionId;
  return routeStoryCompleted(state, route) || legacyReturnTrip;
}

function syncStoryRouteUnlocks(state) {
  const unlocked = new Set(state.world?.unlockedRouteIds || []);
  for (const route of ROUTES.filter(entry => entry.status === "available" && entry.unlock?.type === "resident-story")) {
    if (state.developerMode || routeStoryCompleted(state, route) || routeWasAlreadyTraversed(state, route)) unlocked.add(route.id);
    else unlocked.delete(route.id);
  }
  state.world = { ...state.world, unlockedRouteIds: [...unlocked] };
}

function storyRouteUnlocksAreCurrent(state) {
  return ROUTES.filter(entry => entry.status === "available" && entry.unlock?.type === "resident-story").every(route => {
    const shouldBeUnlocked = Boolean(state.developerMode || routeStoryCompleted(state, route) || routeWasAlreadyTraversed(state, route));
    return state.world?.unlockedRouteIds?.includes(route.id) === shouldBeUnlocked;
  });
}

function migrateDeveloperUnlocks(state, raw) {
  const full = createDeveloperState();
  const priorDiscoveries = raw?.discovered && typeof raw.discovered === "object" ? raw.discovered : {};
  const newlyCataloguedFish = FISH.filter(fish => !Object.hasOwn(priorDiscoveries, fish.id));

  state.developerMode = true;
  state.tideglow = { ...state.tideglow, enabled: true, seenIntro: true };
  state.money = Math.max(state.money, full.money);
  state.ownedRods = [...new Set([...(Array.isArray(state.ownedRods) ? state.ownedRods : []), ...full.ownedRods])];
  state.ownedFurniture = [...new Set([...(Array.isArray(state.ownedFurniture) ? state.ownedFurniture : []), ...full.ownedFurniture])];
  state.baitAmounts = Object.fromEntries(BAITS.map(bait => [bait.id, Math.max(Number(state.baitAmounts?.[bait.id]) || 0, full.baitAmounts[bait.id])]));
  state.completedMilestones = [...new Set([...(Array.isArray(state.completedMilestones) ? state.completedMilestones : []), ...full.completedMilestones])];
  state.completedTutorial = true;
  state.tutorialVersion = TUTORIAL_VERSION;
  state.tutorialStep = TUTORIAL_TOTAL_STEPS;
  state.tutorialCatchUid = null;

  for (const fish of newlyCataloguedFish) state.discovered[fish.id] = full.discovered[fish.id];
  const heldFishIds = new Set([...state.catchInventory, ...state.aquarium.fish].map(caught => caught.fishId));
  const fullSpecimens = [...full.catchInventory, ...full.aquarium.fish];
  for (const fish of newlyCataloguedFish) {
    if (heldFishIds.has(fish.id)) continue;
    const specimen = fullSpecimens.find(caught => caught.fishId === fish.id);
    if (specimen) state.catchInventory.push(specimen);
  }

  state.achievements = { ...full.achievements, ...state.achievements };
  state.unlockedTitles = [...new Set([...full.unlockedTitles, ...(Array.isArray(state.unlockedTitles) ? state.unlockedTitles : [])])];
  state.unlockedAquariumDecor = [...new Set([...full.unlockedAquariumDecor, ...(Array.isArray(state.unlockedAquariumDecor) ? state.unlockedAquariumDecor : [])])];
  if (!state.unlockedTitles.includes(state.equippedTitle)) state.equippedTitle = full.equippedTitle;
  if (!state.unlockedAquariumDecor.includes(state.aquariumDecoration)) state.aquariumDecoration = full.aquariumDecoration;
  state.totalCaught = Math.max(state.totalCaught, full.totalCaught);
  state.totalSold = Math.max(state.totalSold, full.totalSold);
  state.recordCatches = Math.max(state.recordCatches, full.recordCatches);
  const developerWorld = createDeveloperWorldState({
    discoveredFishIds: Object.keys(state.discovered),
    currentRegionId: state.world?.currentRegionId
  });
  state.world = {
    ...state.world,
    visitedRegionIds: [...new Set([...developerWorld.visitedRegionIds, ...(state.world?.visitedRegionIds || [])])],
    unlockedRouteIds: [...new Set([...developerWorld.unlockedRouteIds, ...(state.world?.unlockedRouteIds || [])])],
    completedRouteIds: [...new Set(state.world?.completedRouteIds || [])],
    regionProgress: Object.fromEntries(developerWorld.visitedRegionIds.map(regionId => {
      const fullProgress = developerWorld.regionProgress[regionId];
      const savedProgress = state.world?.regionProgress?.[regionId];
      return [regionId, {
        ...fullProgress,
        ...(savedProgress || {}),
        discoveredFishIds: [...new Set([
          ...(fullProgress?.discoveredFishIds || []),
          ...(savedProgress?.discoveredFishIds || [])
        ])]
      }];
    }))
  };
  state.observations = raw?.observations && typeof raw.observations === "object"
    ? normalizeObservationState(raw.observations, state.day)
    : createDeveloperObservationState({ day: state.day, observedAt: state.lastSavedAt || new Date().toISOString() });
  state.residentCommissions = normalizeResidentCommissionState(
    state.residentCommissions,
    state.day,
    getProgressAvailabilityContext(state)
  );
  state.residentStories = normalizeResidentStoryState(state.residentStories);
  state.ships = normalizeShipsState({
    ...state.ships,
    ownedShipIds: [...new Set([...state.ships.ownedShipIds, ...SHIPS.filter(ship => ship.status === "implemented").map(ship => ship.id)])],
    revealedShipIds: SHIPS.map(ship => ship.id)
  });
  for (const item of SHIP_FURNITURE) grantShipFurniture(state, item.id);
  for (const shipId of state.ships.ownedShipIds) {
    if (!raw?.ships?.interiorsByShipId?.[shipId]) fillShipFurnitureForDeveloper(state, shipId);
  }
  syncLegacyStarterFurniture(state);
  for (const region of REGIONS) evaluateResearchProgress(state, region.id);
  evaluateAchievements(state);
  return state;
}

export function migrateState(raw) {
  const base = createInitialState();
  if (!raw || typeof raw !== "object") return base;
  const merged = { ...base, ...raw, version: SAVE_VERSION };
  Object.assign(merged, normalizeTutorialProgress(raw));
  merged.day = Math.max(1, Math.floor(Number(merged.day) || 1));
  merged.timeIndex = Math.min(TIMES.length - 1, Math.max(0, Math.floor(Number(merged.timeIndex) || 0)));
  merged.weather = ["sunny", "rain"].includes(merged.weather) ? merged.weather : base.weather;
  merged.baitAmounts = { ...base.baitAmounts, ...(raw.baitAmounts || {}) };
  merged.placedFurniture = { ...base.placedFurniture, ...(raw.placedFurniture || {}) };
  const rawVersion = Math.max(0, Math.floor(Number(raw.version) || 0));
  if (rawVersion < SAVE_VERSION) {
    merged.gameEvents = createGameEventState();
    merged.tideglow = createTideglowState();
    merged.ships = createShipShell(
      uniqueKnownIds(raw.ownedFurniture, FURNITURE).length ? uniqueKnownIds(raw.ownedFurniture, FURNITURE) : base.ownedFurniture,
      merged.placedFurniture
    );
    merged.journal = createJournalShell();
    merged.autoFishing = createAutoFishingShell();
  } else {
    merged.gameEvents = normalizeGameEventState(raw.gameEvents);
    merged.tideglow = normalizeTideglowState(raw.tideglow, { allowDeveloperAdjustment: raw.developerMode === true });
    const sourceShips = raw.ships && typeof raw.ships === "object" ? raw.ships : {};
    const starterInterior = sourceShips.interiorsByShipId?.[STARTER_SHIP_ID];
    merged.ships = normalizeShipsState({
      ...createShipShell(),
      ...sourceShips,
      activeShipId: typeof sourceShips.activeShipId === "string" ? sourceShips.activeShipId : STARTER_SHIP_ID,
      ownedShipIds: [...new Set(Array.isArray(sourceShips.ownedShipIds) ? sourceShips.ownedShipIds.filter(id => typeof id === "string") : [STARTER_SHIP_ID])],
      purchasedAtByShipId: sourceShips.purchasedAtByShipId && typeof sourceShips.purchasedAtByShipId === "object" ? { ...sourceShips.purchasedAtByShipId } : {},
      revealedShipIds: [...new Set(Array.isArray(sourceShips.revealedShipIds) ? sourceShips.revealedShipIds.filter(id => typeof id === "string") : [STARTER_SHIP_ID])],
      interiorsByShipId: {
        ...(sourceShips.interiorsByShipId && typeof sourceShips.interiorsByShipId === "object" ? sourceShips.interiorsByShipId : {}),
        [STARTER_SHIP_ID]: {
          ownedFurnitureIds: uniqueKnownIds(starterInterior?.ownedFurnitureIds, FURNITURE).length
            ? uniqueKnownIds(starterInterior.ownedFurnitureIds, FURNITURE)
            : [...base.ownedFurniture],
          placedFurniture: { ...base.placedFurniture, ...(starterInterior?.placedFurniture || {}) },
          lightingId: typeof starterInterior?.lightingId === "string" ? starterInterior.lightingId : "default",
          aquariumFrameId: typeof starterInterior?.aquariumFrameId === "string" ? starterInterior.aquariumFrameId : "default"
        }
      }
    }, { starterInterior: createShipShell().interiorsByShipId[STARTER_SHIP_ID] });
    merged.journal = normalizeJournalState(raw.journal);
    merged.autoFishing = normalizeAutoFishingState(raw.autoFishing);
  }
  merged.settings = normalizeDisplaySettings({ ...base.settings, ...(raw.settings || {}) });
  merged.travelSettings = {
    ...base.travelSettings,
    ...(raw.travelSettings && typeof raw.travelSettings === "object" ? raw.travelSettings : {}),
    developerDurationScale: normalizeTravelScale(raw.travelSettings?.developerDurationScale)
  };
  merged.discovered = Object.fromEntries(Object.entries(raw.discovered || {})
    .filter(([fishId]) => isKnownId(FISH, fishId))
    .map(([fishId, record]) => [fishId, migrateDiscovery(record)])
    .filter(([, record]) => record.count > 0));
  merged.world = normalizeWorldState(raw.world, {
    legacyDiscoveredFishIds: Object.keys(merged.discovered),
    backfillLegacyDiscoveries: rawVersion < SAVE_VERSION || !raw.world,
    firstArrivedAt: safeDate(raw.lastSavedAt)
  });
  const reachedSecondChapter = merged.world.visitedRegionIds.some(regionId => regionId !== SLEEPING_TIDE_BAY_ID)
    || merged.ships.ownedShipIds.some(shipId => shipId !== STARTER_SHIP_ID);
  if (reachedSecondChapter && !merged.tideglow.enabled) {
    merged.tideglow = { ...merged.tideglow, enabled: true };
  }
  merged.observations = normalizeObservationState(raw.observations, merged.day);
  merged.residentStories = normalizeResidentStoryState(raw.residentStories);
  syncStoryRouteUnlocks(merged);
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
  merged.bayEventHistory = migrateBayEventHistory(raw.bayEventHistory);
  merged.bayEvent = migrateBayEvent(raw.bayEvent, merged.day, SLEEPING_TIDE_BAY_ID);
  merged.regionEvents = Object.fromEntries(REGIONS.filter(region => region.status === "available").map(region => [
    region.id,
    region.id === SLEEPING_TIDE_BAY_ID
      ? merged.bayEvent
      : migrateBayEvent(raw.regionEvents?.[region.id], merged.day, region.id)
  ]));
  applyBayEventWorldConditions(merged);
  const validTitles = new Set([
    DEFAULT_TITLE,
    ...ACHIEVEMENTS.filter(item => item.reward.type === "title").map(item => item.reward.value),
    ...BAY_EVENTS.filter(item => item.firstReward.type === "title").map(item => item.firstReward.value)
  ]);
  const validDecor = new Set(AQUARIUM_DECORATIONS.map(item => item.id));
  merged.unlockedTitles = [...new Set([DEFAULT_TITLE, ...(Array.isArray(raw.unlockedTitles) ? raw.unlockedTitles.filter(title => validTitles.has(title)) : [])])];
  merged.unlockedAquariumDecor = [...new Set(Array.isArray(raw.unlockedAquariumDecor) ? raw.unlockedAquariumDecor.filter(id => validDecor.has(id)) : [])];
  for (const achievement of ACHIEVEMENTS) {
    if (!merged.achievements[achievement.id]?.claimed) continue;
    if (achievement.reward.type === "title" && !merged.unlockedTitles.includes(achievement.reward.value)) merged.unlockedTitles.push(achievement.reward.value);
    if (achievement.reward.type === "aquariumDecor" && !merged.unlockedAquariumDecor.includes(achievement.reward.value)) merged.unlockedAquariumDecor.push(achievement.reward.value);
  }
  for (const event of BAY_EVENTS) {
    if (!merged.bayEventHistory[event.id]?.completions || event.firstReward.type !== "title") continue;
    if (!merged.unlockedTitles.includes(event.firstReward.value)) merged.unlockedTitles.push(event.firstReward.value);
  }
  merged.equippedTitle = merged.unlockedTitles.includes(raw.equippedTitle) ? raw.equippedTitle : base.equippedTitle;
  merged.aquariumDecoration = merged.unlockedAquariumDecor.includes(raw.aquariumDecoration) ? raw.aquariumDecoration : null;
  const progressAvailability = getProgressAvailabilityContext(merged);
  merged.dailyBoard = normalizeDailyBoard(raw.dailyBoard, merged.day, progressAvailability, raw.currentQuests);
  merged.residentCommissions = normalizeResidentCommissionState(raw.residentCommissions, merged.day, progressAvailability);
  merged.chartView = normalizeChartView(raw.chartView);
  for (const region of REGIONS) evaluateResearchProgress(merged, region.id);
  delete merged.currentQuests;
  delete merged.questHistory;
  merged.money = Math.max(0, Number(merged.money) || 0);
  merged.totalSold = nonNegativeNumber(merged.totalSold);
  const recordedCatchTotal = Object.values(merged.discovered).reduce((sum, record) => sum + (record.manualCount || 0), 0);
  merged.totalCaught = Math.max(Math.floor(nonNegativeNumber(merged.totalCaught)), recordedCatchTotal);
  const heldRecordCatches = [...merged.catchInventory, ...merged.aquarium.fish].filter(caught => caught.sizeTier === "record").length;
  merged.recordCatches = Math.max(Math.floor(nonNegativeNumber(merged.recordCatches)), heldRecordCatches);
  evaluateAchievements(merged);
  revealEligibleShips(merged);
  syncLegacyStarterFurniture(merged);
  const result = merged.developerMode ? migrateDeveloperUnlocks(merged, raw) : merged;
  result.journal = syncJournalUnlocks(result);
  return result;
}

export function isCurrentSaveSchema(raw) {
  return Math.max(0, Math.floor(Number(raw?.version) || 0)) >= SAVE_VERSION
    && Number(raw?.tutorialVersion) === TUTORIAL_VERSION
    && Number.isInteger(raw?.tutorialStep)
    && raw.tutorialStep >= 0
    && raw.tutorialStep <= TUTORIAL_TOTAL_STEPS
    && (raw?.tutorialCatchUid === null || typeof raw?.tutorialCatchUid === "string")
    && Number(raw?.dailyBoard?.day) >= 1
    && Array.isArray(raw?.dailyBoard?.entries)
    && raw?.residentCommissions && typeof raw.residentCommissions === "object"
    && raw?.observations && typeof raw.observations === "object"
    && raw?.residentStories && typeof raw.residentStories === "object"
    && ["small", "standard", "large"].includes(raw?.settings?.textScale)
    && ["compact", "standard", "large"].includes(raw?.settings?.uiScale)
    && raw?.chartView && typeof raw.chartView === "object"
    && raw?.travelSettings && typeof raw.travelSettings === "object"
    && Number.isFinite(Number(raw.travelSettings.developerDurationScale))
    && Array.isArray(raw?.world?.completedRouteIds)
    && storyRouteUnlocksAreCurrent(raw)
    && Object.values(raw?.world?.regionProgress || {}).every(progress => (
      Array.isArray(progress?.caughtSpotIds) && Array.isArray(progress?.caughtTimeIds)
    ))
    && raw?.regionEvents && typeof raw.regionEvents === "object"
    && REGIONS.filter(region => region.status === "available").every(region => Object.hasOwn(raw.regionEvents, region.id))
    && raw?.gameEvents && Array.isArray(raw.gameEvents.pending) && Array.isArray(raw.gameEvents.recent)
    && raw?.tideglow && Number.isFinite(Number(raw.tideglow.total))
    && typeof raw.tideglow.enabled === "boolean"
    && typeof raw.tideglow.seenIntro === "boolean"
    && (!raw.world?.visitedRegionIds?.some(regionId => regionId !== SLEEPING_TIDE_BAY_ID) || raw.tideglow.enabled)
    && (!raw.ships?.ownedShipIds?.some(shipId => shipId !== STARTER_SHIP_ID) || raw.tideglow.enabled)
    && raw?.ships && Array.isArray(raw.ships.ownedShipIds)
    && raw.ships.catalogVersion === SHIP_CATALOG_VERSION
    && raw.ships.interiorVersion === SHIP_INTERIOR_VERSION
    && raw.ships.ownedShipIds.every(shipId => raw.ships.interiorsByShipId?.[shipId]?.placedFurniture)
    && raw?.journal && raw.journal.version === JOURNAL_VERSION
    && raw.journal.fishEncounterLineById && typeof raw.journal.fishEncounterLineById === "object"
    && Array.isArray(raw.journal.readEntryIds) && Array.isArray(raw.journal.unreadEntryIds)
    && Array.isArray(raw.journal.pendingNoticeEntryIds)
    && raw?.autoFishing && raw.autoFishing.version === AUTO_FISHING_VERSION
    && Array.isArray(raw.autoFishing.settledSessionIds);
}

export function discoveredCount(state) {
  return Object.keys(state.discovered).length;
}

export function getAquariumCapacity(state) {
  const count = discoveredCount(state);
  return AQUARIUM_CAPACITY_MILESTONES.findLast(milestone => count >= milestone.discoveries)?.capacity || 0;
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
  if (achievement.type === "familiarSpecies") current = records.filter(record => (record.manualCount ?? record.count ?? 0) >= 5).length;
  if (achievement.type === "masteredSpecies") current = records.filter(record => (record.manualCount ?? record.count ?? 0) >= 10).length;
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

function fishAppearanceBonusRatio(fish, state, spotId, baitId) {
  const bait = BAITS.find(item => item.id === baitId) || BAITS[0];
  const currentTime = TIMES[state.timeIndex]?.id || "dawn";
  let ratio = 0;
  if (fish.baits?.includes(baitId)) ratio += FISH_APPEARANCE_BONUSES.recommendedBait;
  if (bait.tags.some(tag => fish.tags?.includes(tag) || tag === fish.rarity || tag === spotId)) {
    ratio += FISH_APPEARANCE_BONUSES.matchingBaitTag;
  }
  if (["common", "uncommon"].includes(fish.rarity) && fish.spots?.includes(spotId)) {
    ratio += FISH_APPEARANCE_BONUSES.nativeSpot;
  }
  if (fish.preferredTimeIds?.includes(currentTime)) ratio += FISH_APPEARANCE_BONUSES.preferredTime;
  if (fish.preferredWeatherIds?.includes(state.weather)) ratio += FISH_APPEARANCE_BONUSES.preferredWeather;
  const bayEvent = getActiveBayEvent(state);
  if (bayEvent && isBayEventConditionActive(state, bayEvent) && bayEventSpotIds(bayEvent).includes(spotId) && bayEvent.fishIds.includes(fish.id)) {
    ratio += Math.max(0, Number(bayEvent.fishAppearanceMultiplier) - 1 || 0);
  }
  return ratio;
}

function highestHighTierRarity(regionFish) {
  return [...HIGH_TIER_RARITIES].reverse().find(rarity => regionFish.some(fish => fish.rarity === rarity)) || "rare";
}

function cascadeHighTierShares(regionFish, spotFish) {
  return cascadeHighTierSplit(
    highestHighTierRarity(regionFish),
    spotFish.filter(fish => HIGH_TIER_RARITIES.includes(fish.rarity)).map(fish => fish.rarity)
  );
}

function appearanceBudgets(regionFish, spotFish, rod = RODS[0]) {
  const requestedHighTierBonus = Math.max(0, Number(rod?.appearanceBonus) || 0);
  const highTierShift = Math.min(BASE_APPEARANCE_BUDGETS.common,
    BASE_APPEARANCE_BUDGETS.highTier * requestedHighTierBonus);
  const highTier = BASE_APPEARANCE_BUDGETS.highTier + highTierShift;
  const highTierShares = cascadeHighTierShares(regionFish, spotFish);
  const budgets = {
    common: BASE_APPEARANCE_BUDGETS.common - highTierShift,
    uncommon: BASE_APPEARANCE_BUDGETS.uncommon,
    noBite: BASE_APPEARANCE_BUDGETS.noBite,
    highTier
  };
  for (const rarity of HIGH_TIER_RARITIES) budgets[rarity] = highTier * highTierShares[rarity];
  return { budgets, highTierShares, highTierShift };
}

function baseAppearanceBudgets(regionFish, spotFish) {
  return appearanceBudgets(regionFish, spotFish, RODS[0]);
}

function appearancePool(regionId, spotId) {
  const regionFish = FISH.filter(fish => Boolean(getFishHabitat(fish, regionId)));
  const spotFish = regionFish.filter(fish => fishCanAppearAtSpot(fish, regionId, spotId));
  return { regionFish, spotFish };
}

export function getFishAppearanceTable(state, spotId = state.selectedSpot, baitId = state.equippedBait) {
  const regionId = state.world?.currentRegionId || SLEEPING_TIDE_BAY_ID;
  const { regionFish, spotFish } = appearancePool(regionId, spotId);
  const rod = RODS.find(item => item.id === state.equippedRod) || RODS[0];
  const base = baseAppearanceBudgets(regionFish, spotFish);
  const adjusted = appearanceBudgets(regionFish, spotFish, rod);
  const entries = [];
  for (const rarity of FISH_RARITY_ORDER) {
    const tierFish = spotFish.filter(fish => fish.rarity === rarity);
    if (!tierFish.length) continue;
    const baseWeightTotal = tierFish.reduce((sum, fish) => sum + Math.max(0, Number(fish.appearanceWeight) || 0), 0);
    const weighted = tierFish.map(fish => {
      const baseWeight = Math.max(0, Number(fish.appearanceWeight) || 0);
      const bonusRatio = fishAppearanceBonusRatio(fish, state, spotId, baitId);
      return { fish, baseWeight, bonusRatio, effectiveWeight: baseWeight * (1 + bonusRatio) };
    });
    const effectiveWeightTotal = weighted.reduce((sum, entry) => sum + entry.effectiveWeight, 0);
    for (const entry of weighted) {
      const baseRate = baseWeightTotal > 0 ? (base.budgets[rarity] || 0) * entry.baseWeight / baseWeightTotal : 0;
      const finalRate = effectiveWeightTotal > 0
        ? (adjusted.budgets[rarity] || 0) * entry.effectiveWeight / effectiveWeightTotal
        : 0;
      entries.push({ ...entry, baseRate, finalRate, bonusRate: finalRate - baseRate });
    }
  }
  const baseTotal = entries.reduce((sum, entry) => sum + entry.baseRate, 0);
  const fishRate = entries.reduce((sum, entry) => sum + entry.finalRate, 0);
  return {
    entries,
    baseTotal,
    fishRate,
    noBiteRate: Math.max(0, 1 - fishRate),
    baseBudgets: base.budgets,
    budgets: adjusted.budgets,
    highTierShares: adjusted.highTierShares,
    highTierShift: adjusted.highTierShift
  };
}

export function getFishAppearanceRate(fish, state, spotId = state.selectedSpot, baitId = state.equippedBait) {
  return getFishAppearanceTable(state, spotId, baitId).entries.find(entry => entry.fish.id === fish?.id)?.finalRate || 0;
}

export function chooseFish(state, random = Math.random) {
  const table = getFishAppearanceTable(state);
  let roll = Math.max(0, Math.min(1, Number(random()) || 0));
  for (const entry of table.entries) {
    roll -= entry.finalRate;
    if (roll < 0) return entry.fish;
  }
  return null;
}

export function getCaptureSuccessRate(fish, rod) {
  const baseRate = Number(RARITY[fish?.rarity]?.catchRate);
  const catchBonus = Math.max(0, Number(rod?.catchBonus) || 0);
  const rate = Math.max(0, Math.min(0.98, (Number.isFinite(baseRate) ? baseRate : 0) + catchBonus));
  return Math.round(rate * 10000) / 10000;
}

export function getUnboostedFishAppearanceRate(fish, regionId = null, spotId = null) {
  const habitat = fish?.habitats?.find(entry => !regionId || entry.regionId === regionId) || fish?.habitats?.[0];
  const resolvedRegionId = regionId || habitat?.regionId || SLEEPING_TIDE_BAY_ID;
  const resolvedSpotId = spotId || habitat?.spotIds?.[0];
  if (!fishCanAppearAtSpot(fish, resolvedRegionId, resolvedSpotId)) return 0;
  const { regionFish, spotFish } = appearancePool(resolvedRegionId, resolvedSpotId);
  const base = baseAppearanceBudgets(regionFish, spotFish);
  const tierFish = spotFish.filter(candidate => candidate.rarity === fish.rarity);
  const totalWeight = tierFish.reduce((sum, candidate) => sum + Math.max(0, Number(candidate.appearanceWeight) || 0), 0);
  return totalWeight > 0 ? (base.budgets[fish.rarity] || 0) * Math.max(0, Number(fish.appearanceWeight) || 0) / totalWeight : 0;
}

export function getUnboostedSingleCastSuccessRate(fish, regionId = null, spotId = null) {
  const appearanceRate = getUnboostedFishAppearanceRate(fish, regionId, spotId);
  const captureRate = Math.max(0, Number(RARITY[fish?.rarity]?.catchRate) || 0);
  return appearanceRate * captureRate;
}

export function rollCaptureSuccess(fish, rod, random = Math.random) {
  const chance = getCaptureSuccessRate(fish, rod);
  return { success: random() < chance, chance };
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
  const regionId = context.regionId || catchState?.world?.currentRegionId || SLEEPING_TIDE_BAY_ID;
  const habitat = getFishHabitat(fish, regionId) || getFishHabitat(fish, SLEEPING_TIDE_BAY_ID);
  const sizeScale = Math.max(.1, Number(habitat?.sizeScale) || 1);
  const minLength = fish.minLength * sizeScale;
  const maxLength = fish.maxLength * sizeScale;
  const minWeight = fish.minWeight * Math.pow(sizeScale, 3);
  const maxWeight = fish.maxWeight * Math.pow(sizeScale, 3);
  const sizeRoll = Math.min(1, Math.max(0, (random() + random()) / 2));
  const length = minLength + (maxLength - minLength) * sizeRoll;
  const weightCurve = Math.pow((length - minLength) / Math.max(1, maxLength - minLength), 1.65);
  const weight = minWeight + (maxWeight - minWeight) * weightCurve * (0.92 + random() * 0.16);
  const ratio = (length - minLength) / (maxLength - minLength);
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

function gameEventContext(state, overrides = {}) {
  return {
    source: overrides.source || "manual",
    occurredAt: overrides.occurredAt || new Date().toISOString(),
    sailingDay: state.day,
    timeId: overrides.timeId ?? TIMES[state.timeIndex]?.id ?? null,
    weatherId: overrides.weatherId ?? overrides.weather ?? state.weather ?? null,
    regionId: overrides.regionId ?? state.world?.currentRegionId ?? null,
    spotId: overrides.spotId ?? state.selectedSpot ?? null,
    shipId: overrides.shipId ?? state.ships?.activeShipId ?? STARTER_SHIP_ID
  };
}

function legacyProgressFromGameEvent(event) {
  if (event.type === "fish.caught") return { type: "catch", source: event.source, ...event.payload };
  if (event.type === "fish.sold") return { type: "sell", source: event.source, ...event.payload };
  if (event.type === "aquarium.displayed") return { type: "aquarium", source: event.source, ...event.payload };
  if (event.type === "observation.recorded") return { type: "observe", source: event.source, ...event.payload };
  return null;
}

function gameEventConsumers(state) {
  return {
    progress: event => {
      const legacy = legacyProgressFromGameEvent(event);
      if (legacy) {
        state.dailyBoard = applyDailyGoalProgress(state.dailyBoard, legacy);
        state.residentCommissions = applyResidentCommissionProgress(state.residentCommissions, legacy);
      }
      return { ok: true };
    },
    story: event => {
      const legacy = legacyProgressFromGameEvent(event);
      if (legacy) state.residentStories = applyResidentStoryProgress(state, legacy);
      return { ok: true };
    },
    tideglow: event => {
      if (!state.tideglow.enabled) {
        // Tideglow activates on first arrival outside 眠潮灣; all other events before that are suppressed.
        if (event.type !== "region.arrived" || event.refs?.regionId === SLEEPING_TIDE_BAY_ID) {
          return { ok: true, awarded: false, reason: "not-enabled" };
        }
        state.tideglow = { ...state.tideglow, enabled: true };
      }
      const result = applyTideglowEvent(state.tideglow, event, {
        allowDeveloperAdjustment: state.developerMode === true,
        allowDeveloperSource: state.developerMode === true
      });
      state.tideglow = result.state;
      const newlyRevealed = result.awarded ? revealEligibleShips(state) : [];
      return { ok: true, ...result, newlyRevealed };
    },
    journal: event => {
      const result = applyJournalEvent(state.journal, event);
      state.journal = result.state;
      return result;
    }
  };
}

export function dispatchGameEvent(state, input, { consumerIds = [] } = {}) {
  const requiredConsumers = [...new Set([...consumerIds, "journal"])];
  const enqueued = enqueueGameEvent(state.gameEvents, { ...gameEventContext(state, input), ...input }, { consumerIds: requiredConsumers });
  state.gameEvents = enqueued.state;
  if (!enqueued.event || enqueued.duplicate) return { ...enqueued, complete: Boolean(enqueued.duplicate), results: {} };
  const consumed = consumeGameEvent(state.gameEvents, enqueued.event.eventId, gameEventConsumers(state));
  state.gameEvents = consumed.state;
  return { ...enqueued, ...consumed };
}

export function retryPendingGameEvents(state) {
  const eventIds = normalizeGameEventState(state.gameEvents).pending.map(event => event.eventId);
  const results = [];
  for (const eventId of eventIds) {
    const result = consumeGameEvent(state.gameEvents, eventId, gameEventConsumers(state));
    state.gameEvents = result.state;
    results.push(result);
  }
  return results;
}

function emitTideglowEvent(state, type, refs, context = {}) {
  return dispatchGameEvent(state, { ...context, type, refs, payload: {} }, { consumerIds: ["tideglow"] });
}

function evaluateResearchWithEvents(state, regionId, source = "manual") {
  const before = getRegionResearchStatus(state, regionId);
  const result = evaluateResearchProgress(state, regionId);
  const tideglowEvents = [];
  for (const node of result.completedNodes || []) {
    tideglowEvents.push(emitTideglowEvent(state, "research.node.completed", { nodeId: node.id, regionId }, { source, regionId }));
  }
  const after = getRegionResearchStatus(state, regionId);
  if (after?.fullComplete && !before?.fullComplete) {
    tideglowEvents.push(emitTideglowEvent(state, "research.region.completed", { regionId }, { source, regionId }));
  }
  return { ...result, tideglowEvents };
}

export function recordCatch(state, caught, baitId = state.equippedBait, { source = "manual" } = {}) {
  const progressSource = source === "tutorial" ? "tutorial" : "manual";
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
    manualCount: (prior?.manualCount ?? prior?.count ?? 0) + 1,
    autoCount: prior?.autoCount || 0,
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
  const regionalDiscovery = recordRegionalDiscovery(
    state.world,
    caught.fishId,
    context.regionId || state.world?.currentRegionId || SLEEPING_TIDE_BAY_ID,
    { spotId: context.spotId, timeId: context.timeId }
  );
  state.world = regionalDiscovery.world;
  const familiarity = getFamiliarity(state.discovered[caught.fishId].count);
  state.catchInventory.push(caught);
  state.totalCaught += 1;
  if (caught.sizeTier === "record") state.recordCatches = (state.recordCatches || 0) + 1;
  if (isNew) state.money += 35 + ({ common: 0, uncommon: 30, rare: 100, epic: 220 }[fish.rarity] || 0);
  if (isFirstShimmer) state.money += SHIMMER_CONFIG.researchReward;
  const progressUpdate = updateProgressEvent(state, {
    type: "catch",
    source: progressSource,
    fish,
    caught,
    baitId: context.baitId || baitId,
    regionId: context.regionId,
    spotId: context.spotId,
    timeId: context.timeId,
    weather: context.weather,
    isNew, isFirstShimmer, isLengthRecord, isWeightRecord
  });
  const discoveryEvent = isNew
    ? emitTideglowEvent(state, "fish.discovered", { fishId: fish.id }, {
      source: progressSource,
      occurredAt: caught.caughtAt,
      regionId: context.regionId,
      spotId: context.spotId,
      timeId: context.timeId,
      weatherId: context.weather
    })
    : null;
  const bayEventUpdate = progressSource === "tutorial"
    ? { updated: false, event: getActiveBayEvent(state) }
    : updateBayEventProgress(state, caught);
  const bayEventJournal = bayEventUpdate?.updated ? dispatchGameEvent(state, {
    type: "region.event.progress",
    source: "manual",
    occurredAt: caught.caughtAt,
    regionId: context.regionId,
    spotId: context.spotId,
    timeId: context.timeId,
    weatherId: context.weather,
    refs: { eventId: bayEventUpdate.event.id, fishId: fish.id },
    payload: { completed: bayEventUpdate.completed }
  }) : null;
  const completedAchievements = evaluateAchievements(state);
  return {
    isNew,
    isNewRegional: regionalDiscovery.isNewRegional,
    isFirstShimmer,
    isLengthRecord,
    isWeightRecord,
    familiarity,
    familiarityChanged: familiarity.id !== priorFamiliarity.id,
    researchUpdate: progressUpdate.researchUpdate,
    tideglowEvents: [discoveryEvent, ...(progressUpdate.researchUpdate?.tideglowEvents || [])].filter(Boolean),
    bayEventUpdate,
    journalEvents: [progressUpdate.dispatched, discoveryEvent, bayEventJournal].filter(Boolean),
    completedAchievements,
    record: state.discovered[caught.fishId]
  };
}

export function sellCatches(state, uids, { source = "manual" } = {}) {
  const progressSource = source === "tutorial" ? "tutorial" : "manual";
  const uidSet = new Set(uids);
  const sold = state.catchInventory.filter(item => uidSet.has(item.uid));
  const total = sold.reduce((sum, item) => sum + item.price, 0);
  state.catchInventory = state.catchInventory.filter(item => !uidSet.has(item.uid));
  state.money += total;
  state.totalSold += total;
  updateProgressEvent(state, { type: "sell", source: progressSource, amount: total, count: sold.length });
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
  updateProgressEvent(state, { type: "aquarium", source: "manual", count: 1 });
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
  updateProgressEvent(state, { type: "aquarium", source: "manual", count: 1 });
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
  return purchaseShipFurniture(state, furnitureId).ok;
}

export function buyShipFurniture(state, furnitureId) {
  return purchaseShipFurniture(state, furnitureId);
}

export function placeShipFurniture(state, furnitureId) {
  return placeShipFurnitureState(state, furnitureId);
}

export function updateQuestProgress(state, event) {
  updateProgressEvent(state, { ...event, source: event?.source || "manual" });
}

export function claimQuest(state, instanceId) {
  const result = claimDailyGoal(state.dailyBoard, instanceId);
  if (!result.ok) return false;
  state.dailyBoard = result.board;
  applyStructuredReward(state, result.reward);
  return true;
}

export function updateProgressEvent(state, event) {
  const source = event?.source || "manual";
  const type = event?.type === "catch"
    ? "fish.caught"
    : event?.type === "sell"
      ? "fish.sold"
      : event?.type === "aquarium"
        ? "aquarium.displayed"
        : "observation.recorded";
  const dispatched = dispatchGameEvent(state, {
    type,
    source,
    occurredAt: event?.caught?.caughtAt,
    regionId: event?.regionId,
    spotId: event?.spotId,
    timeId: event?.timeId,
    weatherId: event?.weather,
    refs: {
      ...(event?.fish?.id ? { fishId: event.fish.id } : {}),
      ...(event?.observationId ? { observationId: event.observationId } : {})
    },
    payload: { ...event }
  }, { consumerIds: ["progress", "story"] });
  const researchUpdate = source === "tutorial"
    ? { updated: false, completedNodes: [], rewards: [], tideglowEvents: [] }
    : evaluateResearchWithEvents(state, event?.regionId || state.world?.currentRegionId, source);
  return { dispatched, researchUpdate, ...researchUpdate };
}

export function observeAtSpot(state, spotId, random = Math.random, observedAt = new Date().toISOString()) {
  const result = visitObservationSpot(state.observations, {
    regionId: state.world?.currentRegionId,
    spotId,
    timeId: TIMES[state.timeIndex]?.id,
    weatherId: state.weather,
    day: state.day,
    observedAt,
    docked: state.world?.docking?.status === "docked" && state.world.docking.regionId === state.world.currentRegionId
  }, random);
  if (!result.ok) return result;
  state.observations = result.state;
  const progressUpdate = result.kind === "subject"
    ? updateProgressEvent(state, {
      type: "observe",
      source: "manual",
      observationId: result.subject.id,
      regionId: state.world.currentRegionId,
      spotId,
      timeId: TIMES[state.timeIndex]?.id,
      weather: state.weather
    })
    : { researchUpdate: evaluateResearchWithEvents(state, state.world.currentRegionId) };
  const observationEvent = result.kind === "subject"
    ? emitTideglowEvent(state, "observation.recorded", { observationId: result.subject.id }, {
      source: "manual", occurredAt: observedAt, regionId: state.world.currentRegionId, spotId
    })
    : null;
  const wonderEvent = result.kind === "wonder"
    ? dispatchGameEvent(state, {
      type: "wonder.recorded",
      source: "manual",
      occurredAt: observedAt,
      regionId: state.world.currentRegionId,
      spotId,
      refs: { wonderId: result.wonder.id, regionId: state.world.currentRegionId }
    })
    : null;
  return {
    ...result,
    researchUpdate: progressUpdate.researchUpdate,
    tideglowEvents: [observationEvent, ...(progressUpdate.researchUpdate?.tideglowEvents || [])].filter(Boolean),
    journalEvents: [observationEvent, wonderEvent, ...(progressUpdate.researchUpdate?.tideglowEvents || [])].filter(Boolean)
  };
}

export function acceptResidentStory(state, residentId) {
  return acceptResidentStoryState(state, residentId);
}

export function completeResidentStory(state, residentId) {
  const result = completeResidentStoryState(state, residentId);
  if (!result.ok) return result;
  syncStoryRouteUnlocks(state);
  const tideglowEvent = emitTideglowEvent(state, "resident.story.completed", {
    residentId,
    milestoneId: result.scene.id
  });
  return { ...result, tideglowEvent };
}

export function acceptResidentCommission(state, residentId) {
  const result = acceptResidentCommissionState(state.residentCommissions, residentId, state.day);
  if (result.ok) state.residentCommissions = result.state;
  return result;
}

export function dropResidentCommission(state) {
  const result = dropResidentCommissionState(state.residentCommissions);
  if (result.ok) state.residentCommissions = result.state;
  return result;
}

export function deliverResidentCommission(state, residentId) {
  const result = deliverResidentCommissionState(state.residentCommissions, {
    residentId,
    regionId: state.world?.currentRegionId,
    docked: state.world?.docking?.status === "docked" && state.world.docking.regionId === state.world.currentRegionId
  });
  if (!result.ok) return result;
  state.residentCommissions = result.state;
  applyStructuredReward(state, result.reward);
  return result;
}

export function getRouteDurationForState(state, routeId) {
  const route = ROUTES.find(item => item.id === routeId);
  const scale = state?.developerMode ? state.travelSettings?.developerDurationScale : 1;
  return getRouteTravelDurationMs(route, state?.world, scale, activeShipSpeed(state));
}

export function buyAutoFishingEquipment(state, purchasedAt) {
  return purchaseAutoEquipmentState(state, purchasedAt);
}

export function configureAutoFishing(state, options = {}) {
  return startAutoFishingSessionState(state, options);
}

export function stopAutoFishing(state, reason = "manual") {
  return stopAutoFishingSessionState(state, reason);
}

export function markAutoFishingClosed(state, closedAt) {
  return markAutoClosedState(state, closedAt);
}

export function cancelAutoFishingClosed(state) {
  return cancelAutoCloseState(state);
}

export function settleAutoFishing(state, openedAt) {
  return settleAutoFishingStateOnOpen(state, openedAt);
}

export function acknowledgeAutoFishing(state, summaryId = null) {
  return acknowledgeAutoSummaryState(state, summaryId);
}

export function developerResetAutoFishing(state, owned = true) {
  return resetAutoFishingStateForDeveloper(state, { owned });
}

export function developerSimulateAutoFishing(state, {
  durationMs = AUTO_FISHING_EQUIPMENT.maxOfflineMs,
  openedAt = new Date().toISOString(),
  stopReason = null
} = {}) {
  if (!state?.developerMode || !state.autoFishing?.activeSession) return { ok: false, reason: "inactive" };
  if (["departed", "manual"].includes(stopReason)) return stopAutoFishingSessionState(state, stopReason);
  const openedTimestamp = Date.parse(openedAt);
  if (!Number.isFinite(openedTimestamp)) return { ok: false, reason: "invalid-time" };
  let simulatedDuration = Number(durationMs) || 0;
  if (stopReason === "returned-early") simulatedDuration = 60 * 1000;
  if (stopReason === "three-hour-limit") simulatedDuration = AUTO_FISHING_EQUIPMENT.maxOfflineMs;
  if (stopReason === "clock-rollback") simulatedDuration = -5 * 60 * 1000;
  if (stopReason === "bait-empty") {
    state.baitAmounts[state.autoFishing.activeSession.baitId] = 1;
    simulatedDuration = 8 * 60 * 1000;
  }
  if (stopReason === "no-eligible-fish") {
    state.autoFishing.activeSession = { ...state.autoFishing.activeSession, spotId: "developer-invalid-spot" };
    simulatedDuration = 8 * 60 * 1000;
  }
  if (stopReason === "region-changed") {
    const otherRegionId = REGIONS.find(region => region.status === "available" && region.id !== state.world?.currentRegionId)?.id;
    state.autoFishing.activeSession = { ...state.autoFishing.activeSession, regionId: otherRegionId || "developer-other-region" };
    simulatedDuration = 8 * 60 * 1000;
  }
  const closedAt = new Date(openedTimestamp - simulatedDuration).toISOString();
  if (!markAutoClosedState(state, closedAt)) return { ok: false, reason: "already-closed" };
  return settleAutoFishingStateOnOpen(state, openedAt);
}

export function beginRouteTravel(state, routeId, now = Date.now()) {
  if (!state?.world) return { ok: false, reason: "missing-world", world: state?.world };
  if (!state.world.unlockedRouteIds?.includes(routeId)) return { ok: false, reason: "route-locked", world: state.world };
  if (!isRouteUnlockedForState(state, routeId)) return { ok: false, reason: "story-route-locked", world: state.world };
  const scale = state.developerMode ? state.travelSettings?.developerDurationScale : 1;
  const ship = activeShip(state);
  const speedMultiplier = activeShipSpeed(state);
  const result = beginWorldTravel(state.world, routeId, now, { scale, speedMultiplier, shipId: ship.id });
  if (!result.ok) return result;
  stopAutoFishingSessionState(state, "departed");
  state.world = result.world;
  const travel = state.world.travel;
  const journalEvent = dispatchGameEvent(state, {
    type: "route.departed",
    source: "manual",
    occurredAt: new Date(now).toISOString(),
    regionId: travel.fromRegionId,
    shipId: travel.shipId,
    refs: { routeId, fromRegionId: travel.fromRegionId, toRegionId: travel.toRegionId, shipId: travel.shipId }
  });
  return { ...result, journalEvent };
}

export function progressTravel(state, now = Date.now()) {
  if (!state?.world) return { ok: false, reason: "missing-world", world: state?.world, changed: false, arrived: false };
  const result = advanceWorldTravel(state.world, now);
  if (result.ok && result.changed) state.world = result.world;
  return result;
}

export function dockAtDestination(state, now = Date.now()) {
  if (!state?.world) return { ok: false, reason: "missing-world", world: state?.world };
  const result = dockWorldAtDestination(state.world, now);
  if (!result.ok) return result;
  state.world = result.world;
  const firstSpot = getRegionFishingSpots(result.destinationId)[0];
  if (firstSpot) state.selectedSpot = firstSpot.id;
  state.residentCommissions = refreshResidentOffers(
    state.residentCommissions,
    state.day,
    getProgressAvailabilityContext(state)
  );
  const arrivalEvent = result.firstArrival
    ? emitTideglowEvent(state, "region.arrived", { regionId: result.destinationId }, { regionId: result.destinationId })
    : null;
  const revisitEvent = result.firstArrival ? null : dispatchGameEvent(state, {
    type: "region.revisited",
    source: "manual",
    occurredAt: new Date(now).toISOString(),
    regionId: result.destinationId,
    refs: { regionId: result.destinationId }
  });
  const researchUpdate = evaluateResearchWithEvents(state, result.destinationId);
  applyBayEventWorldConditions(state);
  return { ...result, researchUpdate, tideglowEvents: [arrivalEvent, ...(researchUpdate.tideglowEvents || [])].filter(Boolean), journalEvents: [arrivalEvent, revisitEvent, ...(researchUpdate.tideglowEvents || [])].filter(Boolean) };
}

export function developerAdjustTideglow(state, delta) {
  if (!state?.developerMode) return false;
  state.tideglow = adjustDeveloperTideglow(state.tideglow, delta);
  revealEligibleShips(state);
  return true;
}

export function developerEmitTideglowEvent(state, eventType, refs = {}) {
  if (!state?.developerMode || !TIDEGLOW_SOURCES.some(source => source.eventType === eventType)) return null;
  return emitTideglowEvent(state, eventType, refs, { source: "developer" });
}

export function buyShip(state, shipId, purchasedAt) {
  const result = purchaseShipState(state, shipId, purchasedAt);
  if (!result.ok) return result;
  syncAutoFishingShip(state);
  const journalEvent = dispatchGameEvent(state, {
    type: "ship.purchased",
    source: "manual",
    occurredAt: purchasedAt,
    refs: { shipId: result.ship.id },
    shipId: result.ship.id
  });
  return { ...result, journalEvent };
}

export function switchActiveShip(state, shipId) {
  const result = switchShipState(state, shipId);
  if (result.ok) syncAutoFishingShip(state);
  return result;
}

export function developerSetShipOwned(state, shipId, owned = true) {
  return setShipOwnedForDeveloper(state, shipId, owned);
}

export function developerRevealShips(state) {
  return revealAllShipsForDeveloper(state);
}

export function developerSetShipSpeed(state, speedMultiplier) {
  return setShipSpeedForDeveloper(state, speedMultiplier);
}

export function developerSetTravelScale(state, scale) {
  if (!state?.developerMode) return false;
  state.travelSettings = {
    ...(state.travelSettings || {}),
    developerDurationScale: normalizeTravelScale(scale)
  };
  return true;
}

export function developerArriveTravel(state, now = Date.now()) {
  if (!state?.developerMode || !state.world?.travel) return false;
  state.world = {
    ...state.world,
    travel: { ...state.world.travel, elapsedMs: state.world.travel.durationMs }
  };
  const result = progressTravel(state, now);
  return Boolean(result.ok && result.arrived);
}

export function developerResetRouteState(state) {
  if (!state?.developerMode) return false;
  stopAutoFishingSessionState(state, "region-changed");
  const previousBayProgress = state.world?.regionProgress?.[SLEEPING_TIDE_BAY_ID];
  state.world = createDeveloperWorldState({
    discoveredFishIds: Object.keys(state.discovered || {}),
    currentRegionId: SLEEPING_TIDE_BAY_ID,
    firstArrivedAt: previousBayProgress?.firstArrivedAt || state.lastSavedAt
  });
  const firstSpot = SPOTS.find(spot => spot.regionId === SLEEPING_TIDE_BAY_ID);
  if (firstSpot) state.selectedSpot = firstSpot.id;
  applyBayEventWorldConditions(state);
  return true;
}

export function developerDockRegion(state, regionId) {
  if (!state?.developerMode || !isRegionAvailable(regionId)) return false;
  if (regionId !== state.world?.currentRegionId) stopAutoFishingSessionState(state, "region-changed");
  const developerWorld = createDeveloperWorldState({
    discoveredFishIds: Object.keys(state.discovered || {}),
    currentRegionId: regionId
  });
  const currentProgress = state.world?.regionProgress?.[regionId];
  state.world = {
    ...state.world,
    currentRegionId: regionId,
    visitedRegionIds: [...new Set([...(state.world?.visitedRegionIds || []), regionId])],
    unlockedRouteIds: [...new Set([...(state.world?.unlockedRouteIds || []), ...developerWorld.unlockedRouteIds])],
    regionProgress: {
      ...(state.world?.regionProgress || {}),
      [regionId]: currentProgress || developerWorld.regionProgress[regionId]
    },
    travel: null,
    docking: { status: "docked", regionId }
  };
  const firstSpot = getRegionFishingSpots(regionId)[0];
  if (firstSpot) state.selectedSpot = firstSpot.id;
  state.residentCommissions = refreshResidentOffers(
    state.residentCommissions,
    state.day,
    getProgressAvailabilityContext(state)
  );
  evaluateResearchProgress(state, regionId);
  applyBayEventWorldConditions(state);
  return true;
}

export function developerSetRegionEvent(state, eventId) {
  if (!state?.developerMode) return false;
  const regionId = state.world?.currentRegionId;
  const event = BAY_EVENTS.find(entry => entry.id === eventId && entry.regionId === regionId);
  if (!event) return false;
  const eventState = createBayEventState(state.day, event.id, regionId);
  state.regionEvents = { ...(state.regionEvents || {}), [regionId]: eventState };
  if (regionId === SLEEPING_TIDE_BAY_ID) state.bayEvent = eventState;
  applyBayEventWorldConditions(state);
  return true;
}

export function developerRecordObservation(state, subjectId) {
  if (!state?.developerMode) return false;
  const subject = observationSubjectById(subjectId);
  if (!subject) return false;
  const result = recordObservationSubject(state.observations, subjectId, {
    day: state.day,
    observedAt: new Date().toISOString(),
    timeId: TIMES[state.timeIndex]?.id,
    weatherId: state.weather
  });
  if (!result.ok) return false;
  state.observations = result.state;
  evaluateResearchProgress(state, subject.regionId);
  return true;
}

export function developerResetObservations(state) {
  if (!state?.developerMode) return false;
  state.observations = createObservationState();
  const observationNodeIds = new Set(RESEARCH_NODES
    .filter(node => node.requirement?.type === "observation")
    .map(node => node.id));
  for (const [regionId, progress] of Object.entries(state.world?.regionProgress || {})) {
    state.world.regionProgress[regionId] = {
      ...progress,
      completedResearchIds: (progress.completedResearchIds || []).filter(nodeId => !observationNodeIds.has(nodeId))
    };
  }
  return true;
}

export function developerCompleteRegionResearch(state, regionId = LUMINOUS_ARCHIPELAGO_ID) {
  return completeRegionResearchForDeveloper(state, regionId);
}

export function developerResetChengyeStory(state, residentId = CHENGYE_ID) {
  return resetResidentStory(state, residentId);
}

export function developerSetDailyGoal(state, slotIndex, templateId) {
  const template = DAILY_GOAL_TEMPLATES.find(item => item.id === templateId);
  const index = Math.min(2, Math.max(0, Math.floor(Number(slotIndex) || 0)));
  if (!template || !state.developerMode) return false;
  const entries = [...state.dailyBoard.entries];
  entries[index] = createDailyGoalEntry(template, state.day, index);
  state.dailyBoard = { day: state.day, entries };
  return true;
}

export function developerCompleteDailyGoals(state) {
  if (!state.developerMode) return false;
  state.dailyBoard = { ...state.dailyBoard, entries: state.dailyBoard.entries.map(entry => ({ ...entry, progress: entry.goal })) };
  return true;
}

export function claimAllCompletedDailyGoals(state) {
  const result = claimCompletedDailyGoals(state.dailyBoard);
  state.dailyBoard = result.board;
  result.claims.forEach(claim => applyStructuredReward(state, claim.reward));
  return result.claims;
}

export function developerResetDailyBoard(state) {
  if (!state.developerMode) return false;
  state.dailyBoard = createDailyBoard(state.day, getProgressAvailabilityContext(state));
  return true;
}

export function developerSetResidentOffer(state, residentId, templateId) {
  if (!state.developerMode) return false;
  const result = setResidentOffer(state.residentCommissions, residentId, templateId, state.day, getProgressAvailabilityContext(state));
  if (result.ok) state.residentCommissions = result.state;
  return result.ok;
}

export function developerCompleteResidentCommission(state) {
  if (!state.developerMode) return false;
  const result = completeActiveResidentCommission(state.residentCommissions);
  if (result.ok) state.residentCommissions = result.state;
  return result.ok;
}

export function developerClearResidentCommissionHistory(state) {
  if (!state.developerMode) return false;
  state.residentCommissions = clearResidentCommissionHistory(state.residentCommissions);
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
      if (rewardFurniture) grantShipFurniture(state, rewardFurniture.id);
      unlocked.push(milestone);
    }
  }
  return unlocked;
}

export function advanceTime(state, random = Math.random) {
  const result = { dayChanged: false, autoClaims: [] };
  state.timeIndex = (state.timeIndex + 1) % TIMES.length;
  if (state.timeIndex === 0) {
    state.journal = sealJournalDay(state.journal, state.day);
    result.autoClaims = claimAllCompletedDailyGoals(state);
    state.day += 1;
    result.dayChanged = true;
    state.weather = random() < .35 ? "rain" : "sunny";
    const availability = getProgressAvailabilityContext(state);
    state.dailyBoard = createDailyBoard(state.day, availability);
    state.residentCommissions = refreshResidentOffers(state.residentCommissions, state.day, availability);
    state.bayEvent = createBayEventState(state.day);
    state.regionEvents = createRegionEventStates(state.day);
    state.regionEvents[SLEEPING_TIDE_BAY_ID] = state.bayEvent;
    applyBayEventWorldConditions(state);
  }
  return result;
}

export function getTensionConfig(fish, rod) {
  const halfWidth = rod.tolerance / 2;
  const center = Math.min(.66, .47 + (fish.difficulty - .6) * .08);
  return { safeMin: Math.max(.18, center - halfWidth), safeMax: Math.min(.85, center + halfWidth), breakDelay: Math.max(.75, 1.7 - fish.difficulty * .45) };
}

export function fishById(id) { return FISH.find(item => item.id === id); }
export function rodById(id) { return RODS.find(item => item.id === id); }
export function baitById(id) { return BAITS.find(item => item.id === id); }
export function furnitureById(id) { return findShipFurnitureById(id); }

export function developerFillActiveShipFurniture(state) {
  return fillShipFurnitureForDeveloper(state);
}

export function developerClearActiveShipFurniture(state) {
  return clearShipFurnitureForDeveloper(state);
}

export function developerResetActiveShipSlots(state) {
  return resetShipSlotsForDeveloper(state);
}

export function developerSetActiveShipLighting(state, lightingId) {
  return setShipLightingForDeveloper(state, lightingId);
}
