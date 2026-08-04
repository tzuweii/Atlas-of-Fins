import test from "node:test";
import assert from "node:assert/strict";
import {
  BARRED_MUDSKIPPER_OBSERVATION_ID, BAY_EVENTS, CONTENT_VALIDATION, FISH,
  GRAYCROWN_STONE_COAST_ID, JICEN_ID, MIST_CAPE_COLD_CURRENT_ID,
  MIST_CAPE_TO_MONSOON_ROUTE_ID, MONSOON_ARCHIPELAGO_ID, MONSOON_FISH,
  MONSOON_TO_GRAYCROWN_ROUTE_ID, OBSERVATION_SUBJECTS, REGIONS, RESIDENT_STORY_SCENES,
  ROUTES, WONDERS, YELLOW_SEAHORSE_OBSERVATION_ID, getFishHabitat, getRegionFish,
  getRegionFishingSpots, getRegionObservationSpots
} from "../src/data.js";
import {
  acceptResidentStory, beginRouteTravel, completeResidentStory, createDeveloperState,
  createInitialState, developerDockRegion, developerRecordObservation, developerResetObservations,
  dockAtDestination, getJournalEntries, getRegionResearchStatus, getResidentStoryStatus,
  getRouteDurationForState, isRouteRevealedForState, isRouteUnlockedForState, migrateState,
  progressTravel, updateQuestProgress
} from "../src/core.js";
import { evaluateResearchProgress } from "../src/systems/research.js";

const T0 = Date.parse("2026-08-04T00:00:00.000Z");
const iso = milliseconds => new Date(milliseconds).toISOString();

function manualCatch(spotId, { source = "manual", weather = "sunny" } = {}) {
  const fish = MONSOON_FISH.find(candidate => candidate.spots.includes(spotId));
  return {
    type: "catch",
    source,
    fish,
    caught: { sizeTier: "standard" },
    regionId: MONSOON_ARCHIPELAGO_ID,
    spotId,
    timeId: "day",
    weather
  };
}

test("Monsoon Archipelago has one port, three fishing habitats, one observation point, and thirty-six audited fish", () => {
  assert.equal(CONTENT_VALIDATION.ok, true);
  const region = REGIONS.find(entry => entry.id === MONSOON_ARCHIPELAGO_ID);
  assert.equal(region.portName, "回風港");
  assert.equal(region.status, "available");
  assert.equal(getRegionFishingSpots(region.id).length, 3);
  assert.equal(getRegionObservationSpots(region.id).length, 1);
  assert.equal(MONSOON_FISH.length, 36);
  assert.equal(getRegionFish(FISH, region.id).length, 36);
  assert.equal(new Set(MONSOON_FISH.map(fish => fish.id)).size, 36);
  assert.equal(new Set(MONSOON_FISH.map(fish => fish.scientific)).size, 36);
  assert.deepEqual(
    Object.fromEntries(["common", "uncommon", "rare", "epic"].map(rarity => [
      rarity,
      MONSOON_FISH.filter(fish => fish.rarity === rarity).length
    ])),
    { common: 17, uncommon: 14, rare: 4, epic: 1 }
  );
  assert.ok(MONSOON_FISH.every(fish => {
    const habitat = getFishHabitat(fish, region.id);
    return fish.habitats.length === 1
      && habitat?.spotIds.length === 1
      && fish.spots.length === 1
      && fish.spots[0] === habitat.spotIds[0]
      && typeof fish.bodyClass === "string"
      && Array.isArray(fish.preferredTimeIds)
      && Array.isArray(fish.preferredWeatherIds)
      && /^https:\/\/www\.fishbase\.se\//.test(fish.ecologySource.url)
      && fish.ecologySource.checkedAt === "2026-08-04";
  }));
});

test("formal observations, research nodes, optional events, and the wonder remain region-scoped", () => {
  const subjects = OBSERVATION_SUBJECTS.filter(subject => subject.regionId === MONSOON_ARCHIPELAGO_ID);
  assert.deepEqual(subjects.map(subject => subject.id), [
    BARRED_MUDSKIPPER_OBSERVATION_ID,
    YELLOW_SEAHORSE_OBSERVATION_ID
  ]);
  assert.ok(subjects.every(subject => subject.spotId === "seasonstone_watch"
    && subject.ecologySource.checkedAt === "2026-08-04"));
  assert.deepEqual(
    BAY_EVENTS.filter(event => event.regionId === MONSOON_ARCHIPELAGO_ID).map(event => event.id),
    ["windward_whitecap_run", "leeward_seagrass_lull", "rainfresh_mangrove_plume"]
  );
  assert.ok(BAY_EVENTS.filter(event => event.regionId === MONSOON_ARCHIPELAGO_ID).every(event => (
    event.goal === 2 && event.firstReward.type === "title" && event.repeatReward.type === "coins"
  )));
  assert.deepEqual(
    WONDERS.filter(wonder => wonder.regionId === MONSOON_ARCHIPELAGO_ID).map(wonder => wonder.id),
    ["dugong_seagrass_breath"]
  );
});

test("Monsoon main research starts at exactly twenty-six of thirty-six and full collection stays voluntary", () => {
  const state = createInitialState();
  const pool = getRegionFish(FISH, MONSOON_ARCHIPELAGO_ID);
  state.world.currentRegionId = MONSOON_ARCHIPELAGO_ID;
  state.world.visitedRegionIds.push(MONSOON_ARCHIPELAGO_ID);
  state.world.docking = { status: "docked", regionId: MONSOON_ARCHIPELAGO_ID };
  state.world.regionProgress[MONSOON_ARCHIPELAGO_ID] = {
    discoveredFishIds: pool.slice(0, 25).map(fish => fish.id),
    caughtSpotIds: getRegionFishingSpots(MONSOON_ARCHIPELAGO_ID).map(spot => spot.id),
    caughtTimeIds: ["day", "night"],
    completedResearchIds: [],
    mainResearchCompletedDay: null,
    fullResearchCompletedDay: null,
    researchRewardIds: [],
    firstArrivedAt: iso(T0)
  };

  assert.equal(evaluateResearchProgress(state, MONSOON_ARCHIPELAGO_ID).rewards.length, 0);
  assert.equal(getRegionResearchStatus(state, MONSOON_ARCHIPELAGO_ID).mainComplete, false);
  state.world.regionProgress[MONSOON_ARCHIPELAGO_ID].discoveredFishIds.push(pool[25].id);
  assert.deepEqual(evaluateResearchProgress(state, MONSOON_ARCHIPELAGO_ID).rewards.map(reward => reward.id), [
    "monsoon_windwater_fieldbook"
  ]);
  assert.equal(getRegionResearchStatus(state, MONSOON_ARCHIPELAGO_ID).mainComplete, true);
  assert.equal(getRegionResearchStatus(state, MONSOON_ARCHIPELAGO_ID).fullComplete, false);

  state.world.regionProgress[MONSOON_ARCHIPELAGO_ID].discoveredFishIds.push(...pool.slice(26).map(fish => fish.id));
  assert.deepEqual(evaluateResearchProgress(state, MONSOON_ARCHIPELAGO_ID).rewards.map(reward => reward.id), [
    "monsoon_region_badge",
    "monsoon_sail_pattern"
  ]);
  assert.equal(getRegionResearchStatus(state, MONSOON_ARCHIPELAGO_ID).fullComplete, true);
});

test("Wuhe's finished seasonal chart unlocks a formal round trip between Mist Cape and Monsoon", () => {
  const oldSave = createInitialState();
  oldSave.completedTutorial = true;
  oldSave.world.currentRegionId = MIST_CAPE_COLD_CURRENT_ID;
  oldSave.world.visitedRegionIds.push(MIST_CAPE_COLD_CURRENT_ID);
  oldSave.world.docking = { status: "docked", regionId: MIST_CAPE_COLD_CURRENT_ID };
  oldSave.residentStories.wuhe = {
    completedSceneIds: ["wuhe_seasonal_section"],
    rewardIds: ["mist_cape_temperature_section_chart"]
  };

  const state = migrateState(structuredClone(oldSave));
  assert.ok(state.world.unlockedRouteIds.includes(MIST_CAPE_TO_MONSOON_ROUTE_ID));
  const outboundDuration = getRouteDurationForState(state, MIST_CAPE_TO_MONSOON_ROUTE_ID);
  assert.equal(beginRouteTravel(state, MIST_CAPE_TO_MONSOON_ROUTE_ID, iso(T0)).ok, true);
  progressTravel(state, iso(T0 + outboundDuration));
  assert.equal(state.world.docking.regionId, MONSOON_ARCHIPELAGO_ID);
  assert.equal(dockAtDestination(state, iso(T0 + outboundDuration + 1)).ok, true);
  assert.equal(state.world.currentRegionId, MONSOON_ARCHIPELAGO_ID);

  const returnAt = T0 + outboundDuration + 1000;
  assert.equal(beginRouteTravel(state, MIST_CAPE_TO_MONSOON_ROUTE_ID, iso(returnAt)).ok, true);
  const returnDuration = state.world.travel.durationMs;
  assert.ok(returnDuration < outboundDuration);
  progressTravel(state, iso(returnAt + returnDuration));
  assert.equal(dockAtDestination(state, iso(returnAt + returnDuration + 1)).ok, true);
  assert.equal(state.world.currentRegionId, MIST_CAPE_COLD_CURRENT_ID);
});

test("Jicen's six missions require manual ordered completion, a formal turn-in, and six fixed journal pages", () => {
  const state = createDeveloperState();
  state.residentStories = {};
  developerDockRegion(state, MONSOON_ARCHIPELAGO_ID);
  developerResetObservations(state);
  const scenes = RESIDENT_STORY_SCENES.filter(scene => scene.residentId === JICEN_ID);
  assert.deepEqual(scenes.map(scene => scene.id), [
    "jicen_longwind_arrival",
    "jicen_two_sides_one_island",
    "jicen_mangrove_airline",
    "jicen_freshwater_plume",
    "jicen_seagrass_cradle",
    "jicen_windstone_route_rubbing"
  ]);
  assert.ok(scenes.every(scene => scene.opening.length >= 5 && scene.completion.length >= 4));
  state.world.regionProgress[MONSOON_ARCHIPELAGO_ID].discoveredFishIds = MONSOON_FISH.slice(0, 25).map(fish => fish.id);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[0].id);
  updateQuestProgress(state, manualCatch("windward_whitecap_passage", { source: "auto" }));
  assert.equal(getResidentStoryStatus(state, JICEN_ID).objectiveProgress, 0);
  updateQuestProgress(state, manualCatch("windward_whitecap_passage"));
  updateQuestProgress(state, manualCatch("windward_whitecap_passage"));
  assert.equal(completeResidentStory(state, JICEN_ID).ok, true);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[1].id);
  updateQuestProgress(state, manualCatch("windward_whitecap_passage"));
  updateQuestProgress(state, manualCatch("leeward_seagrass_bay"));
  assert.equal(completeResidentStory(state, JICEN_ID).ok, true);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[2].id);
  assert.equal(developerRecordObservation(state, BARRED_MUDSKIPPER_OBSERVATION_ID), true);
  assert.equal(completeResidentStory(state, JICEN_ID).ok, true);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[3].id);
  updateQuestProgress(state, manualCatch("rainmangrove_estuary", { weather: "sunny" }));
  assert.equal(getResidentStoryStatus(state, JICEN_ID).objectiveProgress, 0);
  updateQuestProgress(state, manualCatch("rainmangrove_estuary", { weather: "rain" }));
  updateQuestProgress(state, manualCatch("rainmangrove_estuary", { weather: "rain" }));
  assert.equal(completeResidentStory(state, JICEN_ID).ok, true);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[4].id);
  assert.equal(developerRecordObservation(state, YELLOW_SEAHORSE_OBSERVATION_ID), true);
  assert.equal(completeResidentStory(state, JICEN_ID).ok, true);

  assert.equal(acceptResidentStory(state, JICEN_ID).scene.id, scenes[5].id);
  assert.equal(getResidentStoryStatus(state, JICEN_ID).canComplete, false);
  state.world.regionProgress[MONSOON_ARCHIPELAGO_ID].discoveredFishIds.push(MONSOON_FISH[25].id);
  assert.equal(getResidentStoryStatus(state, JICEN_ID).canComplete, true);
  const finale = completeResidentStory(state, JICEN_ID);
  assert.equal(finale.ok, true);
  assert.deepEqual(getResidentStoryStatus(state, JICEN_ID).rewardIds, ["monsoon_windstone_route_rubbing"]);
  assert.equal(getJournalEntries(state, MONSOON_ARCHIPELAGO_ID).length, 6);
  assert.match(finale.scene.completion.map(beat => beat.text).join(""), /風浪|灰冠|石/);
});

test("the Graycrown route is revealed only by formal completion and remains non-sailable preview content", () => {
  const state = createInitialState();
  state.world.currentRegionId = MONSOON_ARCHIPELAGO_ID;
  state.world.visitedRegionIds.push(MONSOON_ARCHIPELAGO_ID);
  state.world.docking = { status: "docked", regionId: MONSOON_ARCHIPELAGO_ID };
  const beforeTurnIn = migrateState(structuredClone(state));
  assert.equal(isRouteRevealedForState(beforeTurnIn, MONSOON_TO_GRAYCROWN_ROUTE_ID), false);
  state.residentStories.jicen = {
    completedSceneIds: ["jicen_windstone_route_rubbing"],
    rewardIds: ["monsoon_windstone_route_rubbing"]
  };
  const restored = migrateState(structuredClone(state));
  assert.equal(ROUTES.find(route => route.id === MONSOON_TO_GRAYCROWN_ROUTE_ID).status, "preview");
  assert.equal(REGIONS.find(region => region.id === GRAYCROWN_STONE_COAST_ID).status, "planned");
  assert.equal(isRouteRevealedForState(restored, MONSOON_TO_GRAYCROWN_ROUTE_ID), true);
  assert.equal(isRouteUnlockedForState(restored, MONSOON_TO_GRAYCROWN_ROUTE_ID), false);
  assert.equal(beginRouteTravel(restored, MONSOON_TO_GRAYCROWN_ROUTE_ID, iso(T0)).ok, false);
});
