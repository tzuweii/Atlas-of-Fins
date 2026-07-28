import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_VALIDATION, FISH, KELP_PIPEFISH_OBSERVATION_ID, LUMINOUS_ARCHIPELAGO_ID,
  LUMINOUS_TO_MIST_CAPE_ROUTE_ID, MIST_CAPE_COLD_CURRENT_ID, MIST_CAPE_FISH,
  OBSERVATION_SUBJECTS, PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID, RESIDENT_STORY_SCENES,
  WUHE_ID, getFishHabitat, getRegionFish, getRegionFishingSpots, getRegionObservationSpots
} from "../src/data.js";
import {
  acceptResidentStory, beginRouteTravel, completeResidentStory, createDeveloperState,
  createInitialState, developerDockRegion, developerRecordObservation, developerResetObservations,
  dockAtDestination, getJournalEntries, getRegionResearchStatus, getResidentStoryStatus,
  getRouteDurationForState, migrateState, progressTravel, updateQuestProgress
} from "../src/core.js";
import { evaluateResearchProgress } from "../src/systems/research.js";

const T0 = Date.parse("2026-07-28T00:00:00.000Z");
const iso = milliseconds => new Date(milliseconds).toISOString();

function manualCatch(spotId, source = "manual") {
  const fish = MIST_CAPE_FISH.find(candidate => candidate.spots.includes(spotId));
  return {
    type: "catch",
    source,
    fish,
    caught: { sizeTier: "standard" },
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    spotId,
    timeId: "day",
    weather: "sunny"
  };
}

test("Mist Cape packages a complete cold-current region and thirty-four sourced fish", () => {
  assert.equal(CONTENT_VALIDATION.ok, true);
  assert.equal(MIST_CAPE_FISH.length, 34);
  assert.equal(new Set(MIST_CAPE_FISH.map(fish => fish.id)).size, 34);
  assert.deepEqual(
    Object.fromEntries(["common", "uncommon", "rare", "epic"].map(rarity => [
      rarity,
      MIST_CAPE_FISH.filter(fish => fish.rarity === rarity).length
    ])),
    { common: 16, uncommon: 13, rare: 4, epic: 1 }
  );
  assert.equal(getRegionFishingSpots(MIST_CAPE_COLD_CURRENT_ID).length, 3);
  assert.equal(getRegionObservationSpots(MIST_CAPE_COLD_CURRENT_ID).length, 1);
  assert.equal(getRegionFish(FISH, MIST_CAPE_COLD_CURRENT_ID).length, 34);
  assert.ok(MIST_CAPE_FISH.every(fish => {
    const habitat = getFishHabitat(fish, MIST_CAPE_COLD_CURRENT_ID);
    return fish.habitats.length === 1
      && habitat?.spotIds.length > 0
      && /^https:\/\/www\.fishbase\.se\//.test(fish.ecologySource.url);
  }));

  const subjects = OBSERVATION_SUBJECTS.filter(subject => subject.regionId === MIST_CAPE_COLD_CURRENT_ID);
  assert.deepEqual(subjects.map(subject => subject.id), [
    PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID,
    KELP_PIPEFISH_OBSERVATION_ID
  ]);
});

test("Chengye's final chart unlocks a timed outbound and familiar return voyage", () => {
  const state = createInitialState();
  state.completedTutorial = true;
  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.visitedRegionIds.push(LUMINOUS_ARCHIPELAGO_ID);
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };
  state.residentStories.chengye = {
    completedSceneIds: ["chengye_current_map"],
    rewardIds: ["chengye_handdrawn_current_map"]
  };

  const ready = migrateState(structuredClone(state));
  assert.ok(ready.world.unlockedRouteIds.includes(LUMINOUS_TO_MIST_CAPE_ROUTE_ID));
  const firstDuration = getRouteDurationForState(ready, LUMINOUS_TO_MIST_CAPE_ROUTE_ID);
  assert.equal(beginRouteTravel(ready, LUMINOUS_TO_MIST_CAPE_ROUTE_ID, iso(T0)).ok, true);
  assert.equal(ready.world.travel.durationMs, firstDuration);
  progressTravel(ready, iso(T0 + firstDuration));
  assert.equal(dockAtDestination(ready, iso(T0 + firstDuration + 1)).ok, true);
  assert.equal(ready.world.currentRegionId, MIST_CAPE_COLD_CURRENT_ID);

  const returnStartedAt = T0 + firstDuration + 1000;
  assert.equal(beginRouteTravel(ready, LUMINOUS_TO_MIST_CAPE_ROUTE_ID, iso(returnStartedAt)).ok, true);
  const returnDuration = ready.world.travel.durationMs;
  assert.ok(returnDuration < firstDuration);
  progressTravel(ready, iso(returnStartedAt + returnDuration));
  assert.equal(dockAtDestination(ready, iso(returnStartedAt + returnDuration + 1)).ok, true);
  assert.equal(ready.world.currentRegionId, LUMINOUS_ARCHIPELAGO_ID);
});

test("Mist Cape main research completes at twenty-eight species and full research at thirty-four", () => {
  const state = createInitialState();
  const pool = getRegionFish(FISH, MIST_CAPE_COLD_CURRENT_ID);
  state.world.currentRegionId = MIST_CAPE_COLD_CURRENT_ID;
  state.world.visitedRegionIds.push(MIST_CAPE_COLD_CURRENT_ID);
  state.world.docking = { status: "docked", regionId: MIST_CAPE_COLD_CURRENT_ID };
  state.world.regionProgress[MIST_CAPE_COLD_CURRENT_ID] = {
    discoveredFishIds: pool.slice(0, 28).map(fish => fish.id),
    completedResearchIds: [],
    mainResearchCompletedDay: null,
    fullResearchCompletedDay: null,
    researchRewardIds: [],
    firstArrivedAt: iso(T0)
  };

  const main = evaluateResearchProgress(state, MIST_CAPE_COLD_CURRENT_ID);
  assert.deepEqual(main.rewards.map(reward => reward.id), ["mist_cape_temperature_fieldbook"]);
  assert.equal(getRegionResearchStatus(state, MIST_CAPE_COLD_CURRENT_ID).mainComplete, true);
  assert.equal(getRegionResearchStatus(state, MIST_CAPE_COLD_CURRENT_ID).fullComplete, false);

  state.world.regionProgress[MIST_CAPE_COLD_CURRENT_ID].discoveredFishIds.push(
    ...pool.slice(28).map(fish => fish.id)
  );
  const full = evaluateResearchProgress(state, MIST_CAPE_COLD_CURRENT_ID);
  assert.deepEqual(full.rewards.map(reward => reward.id), [
    "mist_cape_region_badge",
    "mist_cape_sail_pattern"
  ]);
  assert.equal(getRegionResearchStatus(state, MIST_CAPE_COLD_CURRENT_ID).fullComplete, true);
});

test("Wuhe's six calm missions enforce manual work and leave six permanent journal pages", () => {
  const state = createDeveloperState();
  state.residentStories = {};
  developerDockRegion(state, MIST_CAPE_COLD_CURRENT_ID);
  developerResetObservations(state);
  const scenes = RESIDENT_STORY_SCENES.filter(scene => scene.residentId === WUHE_ID);
  assert.equal(scenes.length, 6);
  assert.ok(scenes.every(scene => scene.opening.length >= 5 && scene.completion.length >= 4));

  let accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_bell_before_harbor");
  updateQuestProgress(state, manualCatch("fogfront_shelf", "auto"));
  assert.equal(getResidentStoryStatus(state, WUHE_ID).objectiveProgress, 0);
  updateQuestProgress(state, manualCatch("fogfront_shelf"));
  updateQuestProgress(state, manualCatch("fogfront_shelf"));
  assert.equal(completeResidentStory(state, WUHE_ID).ok, true);

  accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_two_buckets_of_sea");
  updateQuestProgress(state, manualCatch("fogfront_shelf"));
  updateQuestProgress(state, manualCatch("whispering_kelp_forest"));
  assert.equal(completeResidentStory(state, WUHE_ID).ok, true);

  accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_holdfast_current");
  assert.equal(developerRecordObservation(state, PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID), true);
  assert.equal(completeResidentStory(state, WUHE_ID).ok, true);

  accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_bluecold_sounding");
  updateQuestProgress(state, manualCatch("bluecold_trench"));
  updateQuestProgress(state, manualCatch("bluecold_trench"));
  assert.equal(completeResidentStory(state, WUHE_ID).ok, true);

  accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_kelp_line_moves");
  assert.equal(developerRecordObservation(state, KELP_PIPEFISH_OBSERVATION_ID), true);
  assert.equal(completeResidentStory(state, WUHE_ID).ok, true);

  accepted = acceptResidentStory(state, WUHE_ID);
  assert.equal(accepted.scene.id, "wuhe_seasonal_section");
  assert.equal(getResidentStoryStatus(state, WUHE_ID).canComplete, true);
  const finale = completeResidentStory(state, WUHE_ID);
  assert.equal(finale.ok, true);
  assert.deepEqual(getResidentStoryStatus(state, WUHE_ID).rewardIds, ["mist_cape_temperature_section_chart"]);
  assert.match(finale.scene.completion.map(beat => beat.text).join(""), /季節|長風/);
  assert.equal(getJournalEntries(state, MIST_CAPE_COLD_CURRENT_ID).length, 6);

  const restored = migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(getResidentStoryStatus(restored, WUHE_ID).complete, true);
  assert.equal(getJournalEntries(restored, MIST_CAPE_COLD_CURRENT_ID).length, 6);
  assert.ok(restored.world.regionProgress[MIST_CAPE_COLD_CURRENT_ID]);
  assert.ok(Object.hasOwn(restored.regionEvents, MIST_CAPE_COLD_CURRENT_ID));
});
