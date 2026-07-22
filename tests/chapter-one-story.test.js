import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH, LIGHTHOUSE_KEEPER_ID, SLEEPING_TIDE_BAY_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  acceptResidentStory, beginRouteTravel, completeResidentStory, createInitialState, getJournalEntries,
  getResidentStoryStatus, isRouteUnlockedForState, migrateState, syncJournalUnlocks, updateQuestProgress
} from "../src/core.js";
import { evaluateResearchProgress } from "../src/systems/research.js";

const manualCatch = (state, {
  spotId = "shore", timeId = "day", weather = "sunny", fish = FISH.find(entry => entry.id === "sardine")
} = {}) => updateQuestProgress(state, {
  type: "catch",
  source: "manual",
  fish,
  caught: { sizeTier: "standard" },
  regionId: SLEEPING_TIDE_BAY_ID,
  spotId,
  timeId,
  weather
});

const finishActive = state => {
  const result = completeResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(result.ok, true);
  return result;
};

test("chapter one stays behind the real tutorial and begins with an independent shore trip", () => {
  const state = createInitialState();
  assert.deepEqual(state.world.unlockedRouteIds, []);
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).canAccept, false);

  state.world.unlockedRouteIds = [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID];
  assert.equal(isRouteUnlockedForState(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID), false);
  assert.equal(beginRouteTravel(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, "2026-07-22T00:00:00.000Z").reason, "story-route-locked");
  assert.deepEqual(migrateState(JSON.parse(JSON.stringify(state))).world.unlockedRouteIds, []);

  const legacyTraveler = createInitialState();
  legacyTraveler.world.unlockedRouteIds = [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID];
  legacyTraveler.world.completedRouteIds = [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID];
  legacyTraveler.world.visitedRegionIds.push("luminous_archipelago");
  assert.equal(isRouteUnlockedForState(legacyTraveler, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID), false);
  legacyTraveler.world.currentRegionId = "luminous_archipelago";
  legacyTraveler.world.docking = { status: "docked", regionId: "luminous_archipelago" };
  assert.equal(isRouteUnlockedForState(legacyTraveler, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID), true);

  state.completedTutorial = true;
  const accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.scene.id, "keeper_returning_light");
  manualCatch(state);
  updateQuestProgress(state, {
    type: "catch", source: "auto", fish: FISH[0], caught: { sizeTier: "standard" },
    regionId: SLEEPING_TIDE_BAY_ID, spotId: "shore", timeId: "day", weather: "sunny"
  });
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveProgress, 1);
  manualCatch(state);
  finishActive(state);
  state.journal = syncJournalUnlocks(state);
  assert.deepEqual(getJournalEntries(state, SLEEPING_TIDE_BAY_ID).map(entry => entry.id), [
    "journal:story:sleeping_tide_bay:opening"
  ]);
});

test("chapter one teaches distinct habitats, catch destinations, time, and preferred weather without requiring a rare fish", () => {
  const state = createInitialState();
  state.completedTutorial = true;

  acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  manualCatch(state);
  manualCatch(state);
  finishActive(state);

  let accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.scene.id, "keeper_two_habitats");
  manualCatch(state, { spotId: "shore" });
  manualCatch(state, { spotId: "shore" });
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveProgress, 1);
  manualCatch(state, { spotId: "reef" });
  assert.deepEqual(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveDetails.map(detail => detail.progress), [1, 1]);
  finishActive(state);

  accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.scene.id, "keeper_catch_destinations");
  updateQuestProgress(state, { type: "sell", source: "manual", amount: 100, count: 2 });
  updateQuestProgress(state, { type: "aquarium", source: "manual", count: 1 });
  assert.deepEqual(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveDetails.map(detail => detail.progress), [2, 1]);
  finishActive(state);

  accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.scene.id, "keeper_four_lights");
  manualCatch(state, { timeId: "day" });
  manualCatch(state, { timeId: "day" });
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveProgress, 1);
  manualCatch(state, { timeId: "night" });
  finishActive(state);

  accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.scene.id, "keeper_weather_surface");
  const sunnyFish = FISH.find(fish => fish.habitats[0].regionId === SLEEPING_TIDE_BAY_ID
    && fish.preferredWeatherIds.includes("sunny"));
  manualCatch(state, { weather: "rain", fish: sunnyFish });
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).objectiveProgress, 0);
  manualCatch(state, { weather: "sunny", fish: sunnyFish });
  finishActive(state);
});

test("twenty-four of thirty Sleeping Tide fish complete the eighty-percent gate and the keeper hands over the route chart", () => {
  const state = createInitialState();
  state.completedTutorial = true;
  state.residentStories[LIGHTHOUSE_KEEPER_ID] = {
    completedSceneIds: [
      "keeper_returning_light",
      "keeper_two_habitats",
      "keeper_catch_destinations",
      "keeper_four_lights",
      "keeper_weather_surface"
    ],
    rewardIds: []
  };

  const accepted = acceptResidentStory(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(accepted.scene.id, "keeper_outer_current_chart");
  const bayFishIds = FISH.filter(fish => fish.habitats[0].regionId === SLEEPING_TIDE_BAY_ID).map(fish => fish.id);
  state.world.regionProgress[SLEEPING_TIDE_BAY_ID].discoveredFishIds = bayFishIds.slice(0, 23);
  evaluateResearchProgress(state, SLEEPING_TIDE_BAY_ID);
  const waiting = getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(waiting.canComplete, false);
  assert.deepEqual(waiting.objectiveDetails.map(detail => ({ label: detail.label, progress: detail.progress, goal: detail.goal })), [
    { label: "完成前五節玩法主線", progress: 5, goal: 5 },
    { label: "眠潮灣魚類探索（24／30＝80%）", progress: 23, goal: 24 }
  ]);

  state.world.regionProgress[SLEEPING_TIDE_BAY_ID].discoveredFishIds.push(bayFishIds[23]);
  evaluateResearchProgress(state, SLEEPING_TIDE_BAY_ID);
  const ready = getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(ready.objectiveProgress, 24);
  assert.deepEqual(ready.objectiveDetails.map(detail => detail.progress), [5, 24]);
  assert.equal(ready.canComplete, true);

  const completed = finishActive(state);
  assert.equal(completed.reward.label, "《眠潮灣外海圖》");
  assert.deepEqual(state.world.unlockedRouteIds, [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID]);
  assert.equal(isRouteUnlockedForState(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID), true);
  assert.equal(getResidentStoryStatus(state, LIGHTHOUSE_KEEPER_ID).complete, true);
  state.journal = syncJournalUnlocks(state);
  assert.equal(getJournalEntries(state, SLEEPING_TIDE_BAY_ID).length, 6);
});
