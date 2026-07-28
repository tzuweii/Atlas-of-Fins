import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, BAITS, BASE_APPEARANCE_BUDGETS, BAY_EVENTS, FISH, FISH_APPEARANCE_BONUSES, FURNITURE, LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID, RARITY, RODS, SLEEPING_TIDE_BAY_ID, fishCanAppearAtSpot } from "../src/data.js";
import {
  SAVE_VERSION, SHIMMER_CONFIG, advanceTime, applyMilestones, buyBait, buyRod, chooseFish, claimAchievement,
  createBayEventState, createDeveloperState, createInitialState, equipTitle, evaluateAchievements, generateCatch, getAchievementProgress,
  getCaptureSuccessRate, getFishAppearanceRate, getFishAppearanceTable, getUnboostedFishAppearanceRate, getUnboostedSingleCastSuccessRate,
  getActiveBayEvent, getAquariumCapacity, getFamiliarity, getScheduledBayEvent, getUnclaimedAchievementCount, migrateState, moveCatchToAquarium,
  recordCatch, removeFishFromAquarium, replaceAquariumFish, rollCaptureSuccess, rollVariant, sellCatches,
  setAquariumDecoration, swapAquariumFish, updateBayEventProgress
} from "../src/core.js";
import {
  TUTORIAL_TOTAL_STEPS, TUTORIAL_VERSION, completeTutorial, normalizeTutorialProgress, tutorialIsActive
} from "../src/systems/tutorial.js";

const NEW_FISH_IDS = [
  "horse_mackerel", "threadfin_bream", "goatfish", "threeline_grunt", "yellow_boxfish",
  "needlefish", "red_seabream", "malabar_grouper", "mirror_butterflyfish", "greater_amberjack"
];

test("catalog preserves the bay and island pools while adding thirty-four distinct Mist Cape fish", () => {
  assert.equal(FISH.length, 97);
  assert.equal(new Set(FISH.map(fish => fish.id)).size, 97);
  assert.deepEqual(Object.fromEntries(Object.entries(RARITY).map(([id, rarity]) => [id, rarity.color])), {
    common: "#686f73",
    uncommon: "#477ca5",
    rare: "#76529b",
    epic: "#ad622b"
  });
  assert.deepEqual(FISH.slice(20, 30).map(fish => fish.id), NEW_FISH_IDS);
  assert.equal(FISH.slice(30, 63).length, 33);
  assert.equal(FISH.slice(30, 63).every(fish => fish.habitats.length === 1
    && fish.habitats[0].regionId === LUMINOUS_ARCHIPELAGO_ID), true);
  assert.equal(FISH.slice(63).length, 34);
  assert.equal(FISH.slice(63).every(fish => fish.habitats.length === 1
    && fish.habitats[0].regionId === MIST_CAPE_COLD_CURRENT_ID), true);
});

test("ten new fish have balanced rarity, preferences, and appearance weights", () => {
  const additions = FISH.filter(fish => NEW_FISH_IDS.includes(fish.id));
  assert.equal(additions.filter(fish => fish.rarity === "common").length, 4);
  assert.equal(additions.filter(fish => fish.rarity === "uncommon").length, 4);
  assert.equal(additions.filter(fish => fish.rarity === "rare").length, 2);
  assert.ok(additions.some(fish => fish.shape === "box"));
  assert.ok(additions.some(fish => fish.shape === "needle"));
  assert.ok(additions.some(fish => fish.preferredWeatherIds.includes("rain")));
  assert.ok(additions.some(fish => fish.spots.includes("shore")));
  assert.ok(additions.some(fish => fish.spots.includes("reef")));
  assert.ok(additions.some(fish => fish.spots.includes("deep")));

  for (const fish of additions) {
    const state = createInitialState();
    state.bayEvent = null;
    state.timeIndex = ["dawn", "day", "dusk", "night"].indexOf(fish.preferredTimeIds[0]);
    state.weather = fish.preferredWeatherIds[0] || "sunny";
    assert.ok(getFishAppearanceRate(fish, state, fish.spots[0], fish.baits[0]) > 0, `${fish.name} can enter its intended fish pool`);
    assert.ok(fish.short.length >= 20 && fish.detail.length >= 40 && fish.fact.length >= 20, `${fish.name} has complete journal writing`);
  }
});

test("developer state unlocks all content without using the normal progression", () => {
  const state = createDeveloperState();
  assert.equal(state.developerMode, true);
  assert.equal(state.completedTutorial, true);
  assert.equal(state.tutorialVersion, TUTORIAL_VERSION);
  assert.equal(state.tutorialStep, TUTORIAL_TOTAL_STEPS);
  assert.equal(state.money, 999999);
  assert.deepEqual(state.ownedRods, RODS.map(item => item.id));
  assert.deepEqual(state.ownedFurniture, FURNITURE.map(item => item.id));
  assert.ok(BAITS.every(item => state.baitAmounts[item.id] === 999));
  assert.equal(Object.keys(state.discovered).length, FISH.length);
  assert.ok(Object.values(state.discovered).every(record => record.count >= 10 && record.caughtShimmer));
  assert.equal(getAquariumCapacity(state), 15);
  assert.equal(state.catchInventory.length + state.aquarium.fish.length, FISH.length);
  assert.equal(Object.keys(state.achievements).length, ACHIEVEMENTS.length);
});

test("forced first-journey tutorial normalizes legacy saves without restarting completed players", () => {
  const initial = createInitialState();
  assert.equal(tutorialIsActive(initial), true);
  assert.deepEqual(normalizeTutorialProgress({ completedTutorial: false, tutorialStep: 1 }), {
    tutorialVersion: TUTORIAL_VERSION,
    completedTutorial: false,
    tutorialStep: 2,
    tutorialCatchUid: null
  });
  assert.deepEqual(normalizeTutorialProgress({ completedTutorial: false, tutorialStep: 4 }), {
    tutorialVersion: TUTORIAL_VERSION,
    completedTutorial: false,
    tutorialStep: 8,
    tutorialCatchUid: null
  });
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 2, completedTutorial: false, tutorialStep: 1 }).tutorialStep, 1);
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 2, completedTutorial: false, tutorialStep: 5 }).tutorialStep, 5);
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 3, completedTutorial: false, tutorialStep: 2 }).tutorialStep, 1);
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 3, completedTutorial: false, tutorialStep: 8 }).tutorialStep, 7);
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 4, completedTutorial: false, tutorialStep: 8 }).tutorialStep, 7);
  assert.equal(normalizeTutorialProgress({ tutorialVersion: 4, completedTutorial: false, tutorialStep: 9 }).tutorialStep, 8);
  const migratedV4Tutorial = migrateState({
    version: SAVE_VERSION,
    tutorialVersion: 4,
    completedTutorial: false,
    tutorialStep: 8,
    tutorialCatchUid: "first-catch"
  });
  assert.equal(migratedV4Tutorial.tutorialVersion, TUTORIAL_VERSION);
  assert.equal(migratedV4Tutorial.tutorialStep, 7);
  assert.equal(migratedV4Tutorial.tutorialCatchUid, "first-catch");
  const completed = normalizeTutorialProgress({ completedTutorial: true, tutorialStep: 2, tutorialCatchUid: "legacy" });
  assert.equal(completed.completedTutorial, true);
  assert.equal(completed.tutorialStep, TUTORIAL_TOTAL_STEPS);
  assert.equal(completed.tutorialCatchUid, null);
  assert.equal(tutorialIsActive(completed), false);
});

test("tutorial can be skipped and remains completed in the saved state", () => {
  const state = createInitialState();
  state.tutorialStep = 5;
  state.tutorialCatchUid = "tutorial-catch";
  assert.equal(completeTutorial(state), true);
  assert.equal(state.completedTutorial, true);
  assert.equal(state.tutorialVersion, TUTORIAL_VERSION);
  assert.equal(state.tutorialStep, TUTORIAL_TOTAL_STEPS);
  assert.equal(state.tutorialCatchUid, null);
  assert.equal(tutorialIsActive(state), false);
  assert.equal(completeTutorial(state), false);
});

test("tutorial catch and sale preserve collection and coins without advancing task objectives", () => {
  const state = createInitialState();
  state.dailyBoard = {
    day: 1,
    entries: [
      { instanceId: "tutorial-catch", progress: 0, goal: 3, claimed: false, condition: { eventType: "catch" } },
      { instanceId: "tutorial-sale", progress: 0, goal: 100, claimed: false, condition: { eventType: "sell", metric: "amount" } }
    ]
  };
  state.residentCommissions = {
    ...state.residentCommissions,
    active: { instanceId: "tutorial-resident", progress: 0, goal: 2, condition: { eventType: "catch" } }
  };
  const fish = FISH.find(item => item.id === "sardine");
  const caught = generateCatch(fish, {
    regionId: SLEEPING_TIDE_BAY_ID,
    spotId: "shore",
    timeId: "dawn",
    weather: "sunny",
    baitId: "bread",
    rodId: "wood",
    day: 1
  }, () => .5);
  const moneyBeforeCatch = state.money;

  const result = recordCatch(state, caught, "bread", { source: "tutorial" });

  assert.equal(result.journalEvents[0].event.source, "tutorial");
  assert.equal(result.bayEventUpdate.updated, false);
  assert.equal(result.researchUpdate.updated, false);
  assert.equal(state.bayEvent.progress, 0);
  assert.deepEqual(state.dailyBoard.entries.map(entry => entry.progress), [0, 0]);
  assert.equal(state.residentCommissions.active.progress, 0);
  assert.equal(state.discovered.sardine.count, 1);
  assert.equal(state.totalCaught, 1);
  assert.equal(state.catchInventory.length, 1);
  assert.ok(state.money > moneyBeforeCatch);
  assert.equal(state.tideglow.total, 0, "chapter 1 keeps Tideglow completely inactive");

  const moneyBeforeSale = state.money;
  const sale = sellCatches(state, [caught.uid], { source: "tutorial" });

  assert.equal(sale.sold, 1);
  assert.ok(sale.total > 0);
  assert.equal(state.money, moneyBeforeSale + sale.total);
  assert.equal(state.totalSold, sale.total);
  assert.deepEqual(state.dailyBoard.entries.map(entry => entry.progress), [0, 0]);
  assert.equal(state.residentCommissions.active.progress, 0);
  assert.equal(state.gameEvents.recent.at(-1).source, "tutorial");
});

test("existing developer saves backfill newly catalogued fish and collection rewards", () => {
  const legacy = createDeveloperState();
  legacy.discovered = Object.fromEntries(Object.entries(legacy.discovered).filter(([fishId]) => !NEW_FISH_IDS.includes(fishId)));
  legacy.catchInventory = legacy.catchInventory.filter(caught => !NEW_FISH_IDS.includes(caught.fishId));
  legacy.aquarium.fish = legacy.aquarium.fish.filter(caught => !NEW_FISH_IDS.includes(caught.fishId));
  legacy.completedMilestones = legacy.completedMilestones.filter(count => count <= 20);
  delete legacy.achievements.species_30;
  legacy.unlockedTitles = legacy.unlockedTitles.filter(title => title !== "海灣博物學家");
  legacy.totalCaught = 200;
  legacy.recordCatches = 20;

  const upgraded = migrateState(legacy);
  const heldFishIds = new Set([...upgraded.catchInventory, ...upgraded.aquarium.fish].map(caught => caught.fishId));
  assert.equal(Object.keys(upgraded.discovered).length, FISH.length);
  assert.ok(NEW_FISH_IDS.every(fishId => upgraded.discovered[fishId]?.count === 10));
  assert.ok(NEW_FISH_IDS.every(fishId => heldFishIds.has(fishId)));
  assert.ok(upgraded.completedMilestones.includes(25));
  assert.ok(upgraded.completedMilestones.includes(30));
  assert.ok(upgraded.achievements.species_30);
  assert.ok(upgraded.unlockedTitles.includes("海灣博物學家"));
  assert.equal(upgraded.totalCaught, FISH.length * 10);
  assert.equal(upgraded.recordCatches, FISH.length);
  assert.equal(getAquariumCapacity(upgraded), 15);
});

test("bay event catalog and daily schedule are deterministic", () => {
  assert.equal(BAY_EVENTS.length, 9);
  assert.equal(BAY_EVENTS.filter(event => event.regionId === SLEEPING_TIDE_BAY_ID).length, 3);
  assert.equal(BAY_EVENTS.filter(event => event.regionId === LUMINOUS_ARCHIPELAGO_ID).length, 3);
  assert.equal(BAY_EVENTS.filter(event => event.regionId === MIST_CAPE_COLD_CURRENT_ID).length, 3);
  assert.equal(new Set(BAY_EVENTS.map(event => event.id)).size, BAY_EVENTS.length);
  assert.equal(getScheduledBayEvent(1)?.id, "silver_tide");
  assert.equal(getScheduledBayEvent(2), null);
  assert.equal(getScheduledBayEvent(3)?.id, "moonlit_tide");
  assert.equal(getScheduledBayEvent(4), null);
  assert.equal(getScheduledBayEvent(5)?.id, "rain_drift");
  assert.equal(getScheduledBayEvent(6), null);
  assert.equal(getScheduledBayEvent(7)?.id, "silver_tide");
  assert.equal(getScheduledBayEvent(1, LUMINOUS_ARCHIPELAGO_ID)?.id, "prism_sunshower");
  assert.equal(getScheduledBayEvent(3, LUMINOUS_ARCHIPELAGO_ID)?.id, "coral_rainveil");
  assert.equal(getScheduledBayEvent(5, LUMINOUS_ARCHIPELAGO_ID)?.id, "blue_channel_pulse");
  assert.equal(getScheduledBayEvent(1, MIST_CAPE_COLD_CURRENT_ID)?.id, "kelp_canopy_lull");
  assert.equal(getScheduledBayEvent(3, MIST_CAPE_COLD_CURRENT_ID)?.id, "fogfront_exchange");
  assert.equal(getScheduledBayEvent(5, MIST_CAPE_COLD_CURRENT_ID)?.id, "cold_rain_upwelling");

  const state = createInitialState();
  assert.equal(getActiveBayEvent(state)?.id, "silver_tide");
  for (let index = 0; index < 4; index++) advanceTime(state, () => 1);
  assert.equal(state.day, 2);
  assert.equal(state.bayEvent, null);
  for (let index = 0; index < 4; index++) advanceTime(state, () => 1);
  assert.equal(state.day, 3);
  assert.equal(state.bayEvent.instanceId, "3-moonlit_tide");
  for (let index = 0; index < 8; index++) advanceTime(state, () => 1);
  assert.equal(state.day, 5);
  assert.equal(state.bayEvent.instanceId, "5-rain_drift");
  assert.equal(state.weather, "rain");
});

test("silver tide only boosts its target fish at the shore", () => {
  const state = createInitialState();
  const quietState = { ...state, bayEvent: null };
  const sardine = FISH.find(fish => fish.id === "sardine");
  const anchovy = FISH.find(fish => fish.id === "anchovy");
  const mackerel = FISH.find(fish => fish.id === "mackerel");
  assert.ok(getFishAppearanceRate(sardine, state, "shore", "bread") > getFishAppearanceRate(sardine, quietState, "shore", "bread"));
  assert.ok(getFishAppearanceRate(anchovy, state, "shore", "bread") > getFishAppearanceRate(anchovy, quietState, "shore", "bread"));
  const eventMackerel = getFishAppearanceTable(state, "shore", "bread").entries.find(entry => entry.fish.id === mackerel.id);
  const quietMackerel = getFishAppearanceTable(quietState, "shore", "bread").entries.find(entry => entry.fish.id === mackerel.id);
  assert.equal(eventMackerel.baseRate, quietMackerel.baseRate, "events never rewrite a fish's published base rate");
});

test("bay event progress filters catches and grants first and repeat rewards once", () => {
  const state = createInitialState();
  const makeCatch = (fishId, spotId = "shore", day = state.day) => generateCatch(
    FISH.find(fish => fish.id === fishId),
    { spotId, timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day },
    () => .5
  );

  assert.equal(recordCatch(state, makeCatch("mackerel")).bayEventUpdate.updated, false);
  assert.equal(recordCatch(state, makeCatch("sardine", "reef")).bayEventUpdate.updated, false);
  assert.equal(recordCatch(state, makeCatch("sardine", "shore", 2)).bayEventUpdate.updated, false);
  assert.equal(state.bayEvent.progress, 0);

  assert.deepEqual(recordCatch(state, makeCatch("sardine")).bayEventUpdate.progress, 1);
  assert.deepEqual(recordCatch(state, makeCatch("anchovy")).bayEventUpdate.progress, 2);
  const firstCompletion = recordCatch(state, makeCatch("sardine")).bayEventUpdate;
  assert.equal(firstCompletion.completed, true);
  assert.equal(firstCompletion.firstCompletion, true);
  assert.equal(firstCompletion.reward.value, "銀潮見證者");
  assert.ok(state.unlockedTitles.includes("銀潮見證者"));
  assert.equal(state.bayEventHistory.silver_tide.completions, 1);
  assert.equal(updateBayEventProgress(state, makeCatch("sardine")).updated, false);

  state.day = 7;
  state.bayEvent = createBayEventState(7);
  const moneyBeforeRepeat = state.money;
  recordCatch(state, makeCatch("sardine"));
  recordCatch(state, makeCatch("anchovy"));
  const repeatCompletion = recordCatch(state, makeCatch("sardine")).bayEventUpdate;
  assert.equal(repeatCompletion.completed, true);
  assert.equal(repeatCompletion.firstCompletion, false);
  assert.equal(repeatCompletion.reward.amount, 60);
  assert.equal(state.money, moneyBeforeRepeat + 60);
  assert.equal(state.bayEventHistory.silver_tide.completions, 2);
});

test("moonlit tide requires night at the reef or deep water", () => {
  const state = createInitialState();
  state.day = 3;
  state.bayEvent = createBayEventState(3);
  const cuttlefish = FISH.find(fish => fish.id === "cuttlefish");
  const quietState = { ...state, bayEvent: null };

  state.timeIndex = 0;
  quietState.timeIndex = 0;
  assert.equal(getFishAppearanceRate(cuttlefish, state, "reef", "shrimp"), getFishAppearanceRate(cuttlefish, quietState, "reef", "shrimp"));
  state.timeIndex = 3;
  quietState.timeIndex = 3;
  assert.ok(getFishAppearanceRate(cuttlefish, state, "reef", "shrimp") > getFishAppearanceRate(cuttlefish, quietState, "reef", "shrimp"));

  const makeCatch = (fishId, spotId, timeId, day = state.day) => generateCatch(
    FISH.find(fish => fish.id === fishId),
    { spotId, timeId, weather: "sunny", baitId: "shrimp", rodId: "wood", day },
    () => .5
  );
  assert.equal(recordCatch(state, makeCatch("cuttlefish", "reef", "dawn")).bayEventUpdate.updated, false);
  assert.equal(recordCatch(state, makeCatch("cuttlefish", "shore", "night")).bayEventUpdate.updated, false);
  assert.equal(state.bayEvent.progress, 0);
  assert.equal(recordCatch(state, makeCatch("cuttlefish", "reef", "night")).bayEventUpdate.progress, 1);
  const completion = recordCatch(state, makeCatch("cutlass", "deep", "night")).bayEventUpdate;
  assert.equal(completion.completed, true);
  assert.equal(completion.reward.value, "月潮聆聽者");
  assert.ok(state.unlockedTitles.includes("月潮聆聽者"));
  assert.equal(state.bayEventHistory.moonlit_tide.completions, 1);

  state.day = 9;
  state.bayEvent = createBayEventState(9);
  const moneyBeforeRepeat = state.money;
  recordCatch(state, makeCatch("cuttlefish", "reef", "night"));
  const repeatCompletion = recordCatch(state, makeCatch("cutlass", "deep", "night")).bayEventUpdate;
  assert.equal(repeatCompletion.reward.amount, 80);
  assert.equal(state.money, moneyBeforeRepeat + 80);
  assert.equal(state.bayEventHistory.moonlit_tide.completions, 2);
});

test("rain drift forces rain and filters reef catches by weather", () => {
  const state = createInitialState();
  state.day = 5;
  state.timeIndex = 0;
  state.bayEvent = createBayEventState(5);
  const blackBream = FISH.find(fish => fish.id === "black_bream");
  const wrasse = FISH.find(fish => fish.id === "wrasse");
  const quietState = { ...state, bayEvent: null };

  state.weather = "sunny";
  quietState.weather = "sunny";
  assert.equal(getFishAppearanceRate(blackBream, state, "reef", "shrimp"), getFishAppearanceRate(blackBream, quietState, "reef", "shrimp"));
  state.weather = "rain";
  quietState.weather = "rain";
  assert.ok(getFishAppearanceRate(blackBream, state, "reef", "shrimp") > getFishAppearanceRate(blackBream, quietState, "reef", "shrimp"));
  assert.equal(
    getFishAppearanceTable(state, "reef", "shrimp").entries.find(entry => entry.fish.id === wrasse.id).baseRate,
    getFishAppearanceTable(quietState, "reef", "shrimp").entries.find(entry => entry.fish.id === wrasse.id).baseRate
  );

  const makeCatch = (fishId, spotId, weather, day = state.day) => generateCatch(
    FISH.find(fish => fish.id === fishId),
    { spotId, timeId: "dawn", weather, baitId: "shrimp", rodId: "wood", day },
    () => .5
  );
  assert.equal(recordCatch(state, makeCatch("black_bream", "reef", "sunny")).bayEventUpdate.updated, false);
  assert.equal(recordCatch(state, makeCatch("black_bream", "shore", "rain")).bayEventUpdate.updated, false);
  assert.equal(recordCatch(state, makeCatch("wrasse", "reef", "rain")).bayEventUpdate.updated, false);
  assert.equal(state.bayEvent.progress, 0);
  assert.equal(recordCatch(state, makeCatch("black_bream", "reef", "rain")).bayEventUpdate.progress, 1);
  const completion = recordCatch(state, makeCatch("scorpionfish", "reef", "rain")).bayEventUpdate;
  assert.equal(completion.completed, true);
  assert.equal(completion.reward.value, "雨潮守望者");
  assert.ok(state.unlockedTitles.includes("雨潮守望者"));

  state.day = 11;
  state.bayEvent = createBayEventState(11);
  const moneyBeforeRepeat = state.money;
  recordCatch(state, makeCatch("black_bream", "reef", "rain"));
  const repeatCompletion = recordCatch(state, makeCatch("scorpionfish", "reef", "rain")).bayEventUpdate;
  assert.equal(repeatCompletion.reward.amount, 90);
  assert.equal(state.money, moneyBeforeRepeat + 90);
  assert.equal(state.bayEventHistory.rain_drift.completions, 2);
});

test("v2 saves migrate to v3 event state and restore event titles", () => {
  const partial = migrateState({
    version: 2,
    day: 1,
    bayEvent: { eventId: "silver_tide", day: 1, progress: 2 }
  });
  assert.equal(partial.version, SAVE_VERSION);
  assert.equal(partial.bayEvent.eventId, "silver_tide");
  assert.equal(partial.bayEvent.progress, 2);

  const alphaOne = migrateState({
    version: 3,
    day: 3,
    bayEvent: { eventId: "silver_tide", day: 3, progress: 2 }
  });
  assert.equal(alphaOne.bayEvent.eventId, "silver_tide");
  assert.equal(alphaOne.bayEvent.progress, 2);

  const completed = migrateState({
    version: 3,
    day: 3,
    bayEventHistory: {
      silver_tide: { completions: 1, firstCompletedAt: "2026-07-16T00:00:00.000Z", lastCompletedDay: 1 },
      moonlit_tide: { completions: 1, firstCompletedAt: "2026-07-16T01:00:00.000Z", lastCompletedDay: 3 },
      rain_drift: { completions: 1, firstCompletedAt: "2026-07-16T02:00:00.000Z", lastCompletedDay: 5 },
      unknown_event: { completions: 99 }
    },
    equippedTitle: "雨潮守望者"
  });
  assert.deepEqual(Object.keys(completed.bayEventHistory), ["silver_tide", "moonlit_tide", "rain_drift"]);
  assert.ok(completed.unlockedTitles.includes("銀潮見證者"));
  assert.ok(completed.unlockedTitles.includes("月潮聆聽者"));
  assert.ok(completed.unlockedTitles.includes("雨潮守望者"));
  assert.equal(completed.equippedTitle, "雨潮守望者");
  assert.equal(completed.bayEvent.instanceId, "3-moonlit_tide");
});

test("fish pool respects fishing spot", () => {
  const state = createInitialState();
  state.selectedSpot = "shore";
  for (const fish of FISH) {
    assert.equal(getFishAppearanceRate(fish, state) > 0, fishCanAppearAtSpot(fish, SLEEPING_TIDE_BAY_ID, "shore"));
  }
  assert.ok(fishCanAppearAtSpot(chooseFish(state, () => .5), SLEEPING_TIDE_BAY_ID, "shore"));
});

test("manual fishing separates weighted appearance from one independent capture roll", () => {
  const common = FISH.find(fish => fish.rarity === "common");
  const uncommon = FISH.find(fish => fish.rarity === "uncommon");
  const rare = FISH.find(fish => fish.rarity === "rare");
  const wood = RODS.find(rod => rod.id === "wood");
  const light = RODS.find(rod => rod.id === "light");
  const farcast = RODS.find(rod => rod.id === "farcast");

  assert.equal(getCaptureSuccessRate(common, wood), 0.9);
  assert.equal(getCaptureSuccessRate(uncommon, light), 0.74);
  assert.equal(getCaptureSuccessRate(rare, farcast), 0.68);
  assert.equal(getCaptureSuccessRate(common, farcast), 0.98, "every fish keeps a possible independent escape outcome");
  assert.deepEqual(rollCaptureSuccess(rare, farcast, () => 0.679), { success: true, chance: 0.68 });
  assert.deepEqual(rollCaptureSuccess(rare, farcast, () => 0.68), { success: false, chance: 0.68 });

  const state = createInitialState();
  const rareFish = FISH.find(fish => fish.rarity === "rare" && fish.spots.includes("deep"));
  state.selectedSpot = "deep";
  state.equippedBait = rareFish.baits[0];
  state.equippedRod = "wood";
  const woodRate = getFishAppearanceRate(rareFish, state);
  state.equippedRod = "farcast";
  assert.ok(getFishAppearanceRate(rareFish, state) > woodRate);
  assert.equal(
    getUnboostedSingleCastSuccessRate(rareFish, SLEEPING_TIDE_BAY_ID, "deep"),
    getUnboostedFishAppearanceRate(rareFish, SLEEPING_TIDE_BAY_ID, "deep") * RARITY.rare.catchRate
  );
  assert.equal("catchBonus" in BAITS[0], false, "bait never changes capture success");
});

test("fixed pool budgets keep a four-percent no-bite outcome through positive bonuses", () => {
  const state = createInitialState();
  state.bayEvent = null;
  state.selectedSpot = "shore";
  state.equippedRod = "wood";
  state.equippedBait = "bread";
  state.timeIndex = 2;
  state.weather = "rain";
  const table = getFishAppearanceTable(state);
  assert.equal(Math.round(table.baseTotal * 100), 96);
  assert.equal(Math.round(table.noBiteRate * 100), 4);
  assert.equal(table.baseBudgets.noBite, BASE_APPEARANCE_BUDGETS.noBite);
  assert.equal(chooseFish(state, () => 1), null, "the unallocated part of one cast is a real no-bite result");
});

test("time and weather preferences are small bonuses rather than eligibility gates or penalties", () => {
  const fish = FISH.find(entry => entry.id === "mullet");
  const state = createInitialState();
  state.bayEvent = null;
  state.selectedSpot = "shore";
  state.equippedRod = "wood";
  state.equippedBait = "worm";
  state.timeIndex = 3;
  state.weather = "rain";
  const neutral = getFishAppearanceRate(fish, state);
  state.timeIndex = 1;
  const preferredTime = getFishAppearanceRate(fish, state);
  state.weather = "sunny";
  const preferredBoth = getFishAppearanceRate(fish, state);
  assert.ok(preferredTime > neutral);
  assert.ok(preferredBoth > preferredTime);
  assert.equal(FISH_APPEARANCE_BONUSES.preferredTime, .05);
  assert.equal(FISH_APPEARANCE_BONUSES.preferredWeather, .05);
});

test("catch price uses size and rarity and records discoveries", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  const context = { regionId: SLEEPING_TIDE_BAY_ID, spotId: "deep", timeId: "night", weather: "rain", baitId: "glow", rodId: "farcast", day: 4 };
  const caught = generateCatch(rare, context, () => .99);
  assert.equal(caught.sizeTier, "record");
  assert.equal(caught.price, Math.round(rare.basePrice * 4 * 1.7));
  assert.deepEqual(caught.context, context);
  const outcome = recordCatch(state, caught);
  assert.equal(outcome.isNew, true);
  assert.equal(outcome.isLengthRecord, true);
  assert.equal(outcome.record.bestLength, caught.length);
  assert.equal(outcome.familiarity.name, "初次相遇");
  assert.equal(state.discovered[rare.id].count, 1);
  assert.deepEqual(state.discovered[rare.id].spots, ["deep"]);
  assert.deepEqual(state.discovered[rare.id].times, ["night"]);
  assert.deepEqual(state.discovered[rare.id].weathers, ["rain"]);
  assert.equal(state.catchInventory.length, 1);

  const shorter = recordCatch(state, { ...caught, uid: `${caught.uid}-shorter`, length: caught.length - 1 });
  assert.equal(shorter.isLengthRecord, false);
  assert.equal(shorter.record.bestLength, caught.length);

  const longer = recordCatch(state, { ...caught, uid: `${caught.uid}-longer`, length: caught.length + 1 });
  assert.equal(longer.isLengthRecord, true);
  assert.equal(longer.record.bestLength, caught.length + 1);
});

test("familiarity progresses at one, three, five, and ten catches", () => {
  assert.equal(getFamiliarity(0).name, "未發現");
  assert.deepEqual([1, 3, 5, 10].map(count => getFamiliarity(count).name), ["初次相遇", "生態筆記", "熟悉", "精通"]);
  assert.equal(getFamiliarity(4).nextCount, 5);
  assert.equal(getFamiliarity(10).nextCount, null);
});

test("shimmer chance combines base, record, and mastery bonuses", () => {
  const state = createInitialState();
  const fishId = FISH[0].id;
  assert.equal(rollVariant(fishId, "standard", state, () => .019).variant, "shimmer");
  assert.equal(rollVariant(fishId, "standard", state, () => .02).variant, "normal");
  assert.equal(rollVariant(fishId, "record", state, () => .039).variant, "shimmer");
  state.discovered[fishId] = { count: 10, shimmerPity: 0 };
  const masteredRecord = rollVariant(fishId, "record", state, () => .049);
  assert.equal(masteredRecord.variant, "shimmer");
  assert.equal(masteredRecord.chance, SHIMMER_CONFIG.maxChance);
});

test("shimmer pity is tracked per fish and lowered by mastery", () => {
  const state = createInitialState();
  const [first, second] = FISH;
  state.discovered[first.id] = { count: 5, shimmerPity: 29 };
  state.discovered[second.id] = { count: 5, shimmerPity: 28 };
  assert.deepEqual(rollVariant(first.id, "standard", state, () => .99), {
    variant: "shimmer", chance: .02, guaranteed: true, pityLimit: 30
  });
  assert.equal(rollVariant(second.id, "standard", state, () => .99).variant, "normal");
  state.discovered[first.id] = { count: 10, shimmerPity: 19 };
  const mastered = rollVariant(first.id, "standard", state, () => .99);
  assert.equal(mastered.variant, "shimmer");
  assert.equal(mastered.pityLimit, 20);
});

test("shimmer catches double final price and reward first research once", () => {
  const state = createInitialState();
  const fish = FISH[0];
  const context = { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 };
  const caught = generateCatch(fish, context, state, () => 0);
  const normalSmallPrice = Math.round(fish.basePrice * .8);
  assert.equal(caught.variant, "shimmer");
  assert.equal(caught.price, normalSmallPrice * SHIMMER_CONFIG.priceMultiplier);
  const initialMoney = state.money;
  const first = recordCatch(state, caught);
  assert.equal(first.isFirstShimmer, true);
  assert.equal(state.discovered[fish.id].shimmerCount, 1);
  assert.equal(state.discovered[fish.id].shimmerPity, 0);
  assert.equal(state.money, initialMoney + 35 + SHIMMER_CONFIG.researchReward);

  const normalCaught = generateCatch(fish, context, () => .5);
  const beforeNormal = state.money;
  const normal = recordCatch(state, normalCaught);
  assert.equal(normalCaught.variant, "normal");
  assert.equal(normal.isFirstShimmer, false);
  assert.equal(state.discovered[fish.id].shimmerPity, 1);
  assert.equal(state.money, beforeNormal);

  const secondCaught = generateCatch(fish, context, state, () => 0);
  const beforeSecond = state.money;
  const second = recordCatch(state, secondCaught);
  assert.equal(second.isFirstShimmer, false);
  assert.equal(state.discovered[fish.id].shimmerCount, 2);
  assert.equal(state.discovered[fish.id].shimmerPity, 0);
  assert.equal(state.money, beforeSecond);
});

test("repeat catches aggregate encounter history without duplicates", () => {
  const state = createInitialState();
  const fish = FISH[0];
  const first = generateCatch(fish, { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 }, () => .5);
  const second = generateCatch(fish, { spotId: "shore", timeId: "day", weather: "rain", baitId: "bread", rodId: "wood", day: 2 }, () => .6);
  recordCatch(state, first);
  recordCatch(state, second);
  assert.deepEqual(state.discovered[fish.id].spots, ["shore"]);
  assert.deepEqual(state.discovered[fish.id].times, ["dawn", "day"]);
  assert.deepEqual(state.discovered[fish.id].weathers, ["sunny", "rain"]);
  assert.equal(state.discovered[fish.id].lastCaught, second.caughtAt);
});

test("aquarium capacity follows discovery milestones", () => {
  const state = createInitialState();
  const expected = new Map([[0, 0], [5, 3], [10, 5], [15, 8], [20, 10], [25, 12], [30, 15]]);
  for (let count = 0; count <= FISH.length; count++) {
    if (count) state.discovered[FISH[count - 1].id] = { count: 1 };
    if (expected.has(count)) assert.equal(getAquariumCapacity(state), expected.get(count));
  }
});

test("aquarium transfers preserve specimens and reject locked or full tanks", () => {
  const state = createInitialState();
  const catches = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 }, () => .4 + index * .01));
  state.catchInventory = [...catches];
  assert.deepEqual(moveCatchToAquarium(state, catches[0].uid), { ok: false, reason: "locked" });
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1 };
  for (const caught of catches.slice(0, 3)) assert.equal(moveCatchToAquarium(state, caught.uid).ok, true);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.catchInventory.length, 1);
  assert.deepEqual(moveCatchToAquarium(state, catches[3].uid), { ok: false, reason: "full" });
  const removed = removeFishFromAquarium(state, catches[1].uid);
  assert.equal(removed.ok, true);
  assert.equal(removed.caught, catches[1]);
  assert.equal(state.catchInventory.at(-1), catches[1]);
});

test("aquarium replacement and reordering never duplicate or lose specimens", () => {
  const state = createInitialState();
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1 };
  const catches = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, () => .35 + index * .01));
  state.catchInventory = [...catches];
  for (const caught of catches.slice(0, 3)) moveCatchToAquarium(state, caught.uid);
  const replaced = replaceAquariumFish(state, catches[3].uid, catches[1].uid);
  assert.equal(replaced.ok, true);
  assert.deepEqual(state.aquarium.fish.map(item => item.uid), [catches[0].uid, catches[3].uid, catches[2].uid]);
  assert.deepEqual(state.catchInventory.map(item => item.uid), [catches[1].uid]);
  assert.equal(swapAquariumFish(state, 0, 2).ok, true);
  assert.deepEqual(state.aquarium.fish.map(item => item.uid), [catches[2].uid, catches[3].uid, catches[0].uid]);
  assert.deepEqual(swapAquariumFish(state, 0, 4), { ok: false, reason: "invalid-index" });
  const allUids = [...state.catchInventory, ...state.aquarium.fish].map(item => item.uid);
  assert.equal(allUids.length, catches.length);
  assert.equal(new Set(allUids).size, catches.length);
});

test("save migration returns aquarium overflow to inventory and removes duplicate UIDs", () => {
  const discovered = Object.fromEntries(FISH.slice(0, 5).map(fish => [fish.id, { count: 1 }]));
  const specimens = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, () => .3 + index * .01));
  const state = migrateState({
    discovered,
    catchInventory: [specimens[0]],
    aquarium: { fish: specimens }
  });
  assert.equal(getAquariumCapacity(state), 3);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.catchInventory.length, 1);
  assert.equal(state.catchInventory[0].uid, specimens[3].uid);
  const uids = [...state.aquarium.fish, ...state.catchInventory].map(item => item.uid);
  assert.equal(new Set(uids).size, 4);
});

test("achievement catalog has thirteen unique data-driven goals", () => {
  assert.equal(ACHIEVEMENTS.length, 13);
  assert.equal(new Set(ACHIEVEMENTS.map(item => item.id)).size, ACHIEVEMENTS.length);
  assert.ok(ACHIEVEMENTS.every(item => item.goal > 0 && item.reward?.label));
});

test("thirty-species collection preserves the legacy goal and grants the final title", () => {
  const state = createInitialState();
  state.discovered = Object.fromEntries(FISH.map(fish => [fish.id, { count: 1, times: [] }]));
  const completed = evaluateAchievements(state);
  assert.ok(completed.some(achievement => achievement.id === "species_20"));
  assert.ok(completed.some(achievement => achievement.id === "species_30"));
  assert.equal(getAchievementProgress(state, "species_30").complete, true);
  assert.equal(claimAchievement(state, "species_30").ok, true);
  assert.ok(state.unlockedTitles.includes("海灣博物學家"));
});

test("achievement evaluation backfills progress once without auto-claiming", () => {
  const state = createInitialState();
  state.totalCaught = 5;
  for (let index = 0; index < 5; index++) {
    state.discovered[FISH[index].id] = {
      count: 1,
      caughtShimmer: index === 0,
      times: index < 4 ? [["dawn", "day", "dusk", "night"][index]] : []
    };
  }
  const completed = evaluateAchievements(state, "2026-07-16T00:00:00.000Z");
  assert.deepEqual(completed.map(item => item.id), ["first_catch", "species_5", "shimmer_1", "conditions_4"]);
  assert.equal(getUnclaimedAchievementCount(state), 4);
  assert.equal(state.achievements.species_5.claimed, false);
  assert.equal(evaluateAchievements(state).length, 0);
  assert.deepEqual(getAchievementProgress(state, "conditions_4"), { current: 4, goal: 4, complete: true });
});

test("achievement rewards can only be claimed once and unlock selectable cosmetics", () => {
  const state = createInitialState();
  state.totalCaught = 1;
  for (let index = 0; index < 5; index++) state.discovered[FISH[index].id] = { count: 1, caughtShimmer: index === 0, times: [] };
  evaluateAchievements(state);
  const money = state.money;
  assert.equal(claimAchievement(state, "first_catch").ok, true);
  assert.equal(state.money, money + 40);
  assert.equal(claimAchievement(state, "first_catch").ok, false);
  assert.equal(state.money, money + 40);

  assert.equal(claimAchievement(state, "species_5").ok, true);
  assert.ok(state.unlockedTitles.includes("海灣訪客"));
  assert.equal(equipTitle(state, "海灣訪客"), true);
  assert.equal(equipTitle(state, "不存在的稱號"), false);
  assert.equal(state.equippedTitle, "海灣訪客");

  assert.equal(claimAchievement(state, "shimmer_1").ok, true);
  assert.ok(state.unlockedAquariumDecor.includes("shimmer_specks"));
  assert.equal(state.aquariumDecoration, "shimmer_specks");
  assert.equal(setAquariumDecoration(state, null), true);
  assert.equal(setAquariumDecoration(state, "shimmer_specks"), true);
});

test("record catches and a full starter aquarium complete their goals", () => {
  const state = createInitialState();
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1, times: [] };
  const catches = FISH.slice(0, 3).map(fish => generateCatch(fish, () => .99));
  for (const caught of catches) recordCatch(state, caught);
  assert.equal(state.recordCatches, 3);
  assert.equal(state.achievements.record_3.claimed, false);
  for (const caught of catches) moveCatchToAquarium(state, caught.uid);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.achievements.aquarium_3.claimed, false);
});

test("migration restores claimed non-coin rewards and backfills current goals", () => {
  const discovered = Object.fromEntries(FISH.slice(0, 5).map((fish, index) => [fish.id, { count: 1, caughtShimmer: index === 0 }]));
  const state = migrateState({
    discovered,
    totalCaught: 5,
    achievements: {
      species_5: { completedAt: "2026-07-16T00:00:00.000Z", claimed: true },
      shimmer_1: { completedAt: "2026-07-16T00:00:00.000Z", claimed: true }
    },
    equippedTitle: "海灣訪客",
    aquariumDecoration: "shimmer_specks"
  });
  assert.ok(state.unlockedTitles.includes("海灣訪客"));
  assert.equal(state.equippedTitle, "海灣訪客");
  assert.ok(state.unlockedAquariumDecor.includes("shimmer_specks"));
  assert.equal(state.aquariumDecoration, "shimmer_specks");
  assert.ok(state.achievements.first_catch);
  assert.equal(state.achievements.first_catch.claimed, false);
});

test("selling cannot make money negative", () => {
  const state = createInitialState();
  const caught = generateCatch(FISH[0], () => .5);
  recordCatch(state, caught);
  const before = state.money;
  const sold = sellCatches(state, [caught.uid]);
  assert.equal(state.money, before + sold.total);
  assert.ok(state.money >= 0);
});

test("purchases enforce unlocks and balances", () => {
  const state = createInitialState();
  state.money = 10000;
  assert.equal(buyRod(state, "light"), false);
  for (let i = 0; i < 4; i++) state.discovered[FISH[i].id] = { count: 1, bestLength: 1, bestWeight: 1 };
  assert.equal(buyRod(state, "light"), true);
  const prior = state.baitAmounts.shrimp;
  assert.equal(buyBait(state, "shrimp"), true);
  assert.ok(state.baitAmounts.shrimp > prior);
});

test("milestones reward once and time advances safely", () => {
  const state = createInitialState();
  for (let i = 0; i < 5; i++) state.discovered[FISH[i].id] = { count: 1, bestLength: 1, bestWeight: 1 };
  const first = applyMilestones(state);
  const money = state.money;
  assert.equal(first.length, 1);
  assert.equal(applyMilestones(state).length, 0);
  assert.equal(state.money, money);
  for (let i = 0; i < 4; i++) advanceTime(state, () => 0);
  assert.equal(state.day, 2);
  assert.equal(state.weather, "rain");
});

test("partial and malformed saves migrate without losing defaults", () => {
  const legacyCatch = {
    uid: "sardine-old",
    fishId: "sardine",
    length: 18,
    weight: .14,
    sizeTier: "standard",
    price: 28,
    caughtAt: "2026-01-02T03:04:05.000Z"
  };
  const state = migrateState({
    version: 1,
    money: -5,
    baitAmounts: { bread: 99 },
    placedFurniture: null,
    discovered: {
      sardine: { count: 3, bestLength: 18, bestWeight: .14, firstCaught: legacyCatch.caughtAt, shimmerCount: 2 },
      anchovy: { count: "invalid" }
    },
    catchInventory: [legacyCatch, { fishId: "missing-fish" }]
  });
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.money, 0);
  assert.equal(state.baitAmounts.bread, 99);
  assert.ok("shrimp" in state.baitAmounts);
  assert.equal(state.placedFurniture.sleep, "sleeping_bag");
  assert.deepEqual(state.discovered.sardine.spots, []);
  assert.equal(state.discovered.sardine.lastCaught, legacyCatch.caughtAt);
  assert.equal(state.discovered.sardine.caughtShimmer, true);
  assert.equal(state.discovered.anchovy, undefined);
  assert.equal(state.catchInventory.length, 1);
  assert.equal(state.catchInventory[0].variant, "normal");
  assert.deepEqual(state.catchInventory[0].context, { regionId: null, spotId: null, timeId: null, weather: null, baitId: null, rodId: null, day: null });
  assert.deepEqual(state.aquarium, { fish: [] });
});
