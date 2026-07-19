import test from "node:test";
import assert from "node:assert/strict";
import {
  CHENGYE_ID, CLARKS_ANEMONEFISH_OBSERVATION_ID, FISH, LUMINOUS_ARCHIPELAGO_ID,
  LUMINOUS_RESEARCH_NODE_IDS, OBSERVATION_SUBJECTS, RESEARCH_NODES, STARLIGHT_OBSERVATION_CAPE_ID,
  TWO_SPINED_ANGELFISH_OBSERVATION_ID, WONDERS, getFishHabitat, getRegionFish
} from "../src/data.js";
import {
  acceptResidentStory, completeResidentStory, createDeveloperState, createInitialState, developerDockRegion,
  developerResetObservations, getRegionResearchStatus, getResidentStoryStatus, migrateState, observeAtSpot, updateQuestProgress
} from "../src/core.js";
import { recordObservationSubject } from "../src/systems/observations.js";
import { evaluateResearchProgress } from "../src/systems/research.js";
import { recordRegionalDiscovery } from "../src/systems/world-state.js";

test("Slice G defines two sourced observation fish and two hidden-until-found wonders", () => {
  assert.equal(OBSERVATION_SUBJECTS.length, 2);
  assert.equal(WONDERS.length, 2);
  assert.deepEqual(OBSERVATION_SUBJECTS.map(subject => subject.id), [
    CLARKS_ANEMONEFISH_OBSERVATION_ID,
    TWO_SPINED_ANGELFISH_OBSERVATION_ID
  ]);
  assert.ok(OBSERVATION_SUBJECTS.every(subject => subject.spotId === STARLIGHT_OBSERVATION_CAPE_ID
    && subject.type === "catalog-fish"
    && subject.pityVisits >= 1
    && /^https:\/\/www\.fishbase\.se\//.test(subject.ecologySource.url)));
  assert.ok(WONDERS.every(wonder => wonder.type === "wonder" && wonder.chance > 0));
  assert.equal(RESEARCH_NODES.length, 7);
});

test("formal observations auto-record, remember misses, and guarantee the twospined angelfish", () => {
  const state = createDeveloperState();
  developerResetObservations(state);
  developerDockRegion(state, LUMINOUS_ARCHIPELAGO_ID);
  state.timeIndex = 0;
  state.day = 100;

  const first = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 1, "2026-07-17T01:00:00.000Z");
  assert.equal(first.kind, "quiet");
  assert.equal(state.observations.attemptsById[CLARKS_ANEMONEFISH_OBSERVATION_ID], 1);
  const repeated = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 0, "2026-07-17T01:01:00.000Z");
  assert.equal(repeated.repeatedPeriod, true);
  assert.equal(state.observations.recordsById[CLARKS_ANEMONEFISH_OBSERVATION_ID], undefined);

  state.timeIndex = 1;
  const clarks = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 1, "2026-07-17T02:00:00.000Z");
  assert.equal(clarks.kind, "subject");
  assert.equal(clarks.subject.id, CLARKS_ANEMONEFISH_OBSERVATION_ID);
  assert.ok(state.observations.recordsById[CLARKS_ANEMONEFISH_OBSERVATION_ID]);

  state.timeIndex = 2;
  const angelfishMissOne = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 1);
  assert.equal(angelfishMissOne.kind, "quiet");
  state.day += 1;
  state.timeIndex = 0;
  const angelfishMissTwo = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 1);
  assert.equal(angelfishMissTwo.kind, "quiet");
  state.timeIndex = 1;
  const guaranteed = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 1);
  assert.equal(guaranteed.kind, "subject");
  assert.equal(guaranteed.subject.id, TWO_SPINED_ANGELFISH_OBSERVATION_ID);
  assert.ok(state.observations.recordsById[TWO_SPINED_ANGELFISH_OBSERVATION_ID]);
});

test("wonders do not alter formal completion and never require a hidden slot", () => {
  const state = createDeveloperState();
  developerResetObservations(state);
  developerDockRegion(state, LUMINOUS_ARCHIPELAGO_ID);
  for (const subject of OBSERVATION_SUBJECTS) {
    const result = recordObservationSubject(state.observations, subject.id, { day: state.day });
    state.observations = result.state;
  }
  state.timeIndex = 3;
  const before = Object.keys(state.observations.recordsById).length;
  const result = observeAtSpot(state, STARLIGHT_OBSERVATION_CAPE_ID, () => 0);
  assert.equal(result.kind, "wonder");
  assert.equal(Object.keys(state.observations.recordsById).length, before);
  assert.equal(Object.keys(state.observations.wonderRecordsById).length, 1);
});

test("luminous research completes its story at twelve species and full collection at thirty-three", () => {
  const state = createInitialState();
  const pool = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID);
  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.visitedRegionIds.push(LUMINOUS_ARCHIPELAGO_ID);
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };
  state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID] = {
    discoveredFishIds: pool.slice(0, 12).map(fish => fish.id),
    completedResearchIds: [],
    mainResearchCompletedDay: null,
    fullResearchCompletedDay: null,
    researchRewardIds: [],
    firstArrivedAt: "2026-07-17T00:00:00.000Z"
  };
  for (const fish of pool.slice(0, 12)) {
    const habitat = getFishHabitat(fish, LUMINOUS_ARCHIPELAGO_ID);
    state.discovered[fish.id] = { count: 1, spots: [...habitat.spotIds], times: [...fish.preferredTimeIds] };
  }

  const main = evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(main.rewards.length, 1);
  assert.equal(getRegionResearchStatus(state, LUMINOUS_ARCHIPELAGO_ID).mainComplete, true);
  assert.equal(getRegionResearchStatus(state, LUMINOUS_ARCHIPELAGO_ID).fullComplete, false);
  assert.equal(evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID).rewards.length, 0);

  for (const fish of pool.slice(12)) {
    const habitat = getFishHabitat(fish, LUMINOUS_ARCHIPELAGO_ID);
    state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].discoveredFishIds.push(fish.id);
    state.discovered[fish.id] = { count: 1, spots: [...habitat.spotIds], times: [...fish.preferredTimeIds] };
  }
  const full = evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID);
  assert.deepEqual(full.rewards.map(reward => reward.id), ["luminous_region_badge", "luminous_sail_pattern"]);
  assert.equal(getRegionResearchStatus(state, LUMINOUS_ARCHIPELAGO_ID).fullComplete, true);
  assert.equal(evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID).rewards.length, 0);
});

test("research time nodes only read catches recorded inside their own region", () => {
  const state = createInitialState();
  const fish = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID)[0];
  const habitat = getFishHabitat(fish, LUMINOUS_ARCHIPELAGO_ID);
  state.discovered[fish.id] = { count: 1, spots: [habitat.spotIds[0]], times: ["night"] };

  const daytime = recordRegionalDiscovery(state.world, fish.id, LUMINOUS_ARCHIPELAGO_ID, {
    spotId: habitat.spotIds[0], timeId: "day"
  });
  state.world = daytime.world;
  evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(
    state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].completedResearchIds.includes(LUMINOUS_RESEARCH_NODE_IDS.nightReef),
    false
  );

  const nighttime = recordRegionalDiscovery(state.world, fish.id, LUMINOUS_ARCHIPELAGO_ID, {
    spotId: habitat.spotIds[0], timeId: "night"
  });
  state.world = nighttime.world;
  evaluateResearchProgress(state, LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(
    state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].completedResearchIds.includes(LUMINOUS_RESEARCH_NODE_IDS.nightReef),
    true
  );
});

test("Chengye's six story missions require accept, manual objectives, and completion while proposals stay independent", () => {
  const state = createDeveloperState();
  state.residentStories = {};
  developerDockRegion(state, LUMINOUS_ARCHIPELAGO_ID);
  const commissionSnapshot = structuredClone(state.residentCommissions);
  const scenes = [];
  for (let index = 0; index < 6; index += 1) {
    const accepted = acceptResidentStory(state, CHENGYE_ID);
    assert.equal(accepted.ok, true);
    assert.ok(accepted.scene.opening.length >= 4);
    assert.ok(accepted.scene.completion.length >= 4);
    if (accepted.scene.objective.kind === "catch") {
      const fish = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID)[0];
      const event = {
        type: "catch",
        fish,
        caught: { sizeTier: "standard" },
        regionId: LUMINOUS_ARCHIPELAGO_ID,
        spotId: accepted.scene.objective.condition.spotIds[0],
        timeId: "day",
        weather: "sunny"
      };
      updateQuestProgress(state, { ...event, source: "auto" });
      assert.equal(getResidentStoryStatus(state, CHENGYE_ID).objectiveProgress, 0);
      for (let progress = 0; progress < accepted.scene.objective.goal; progress += 1) {
        updateQuestProgress(state, { ...event, source: "manual" });
      }
    }
    assert.equal(getResidentStoryStatus(state, CHENGYE_ID).canComplete, true);
    const completed = completeResidentStory(state, CHENGYE_ID);
    assert.equal(completed.ok, true);
    scenes.push(completed.scene.id);
  }
  const status = getResidentStoryStatus(state, CHENGYE_ID);
  assert.equal(new Set(scenes).size, 6);
  assert.equal(status.complete, true);
  assert.deepEqual(status.rewardIds, ["chengye_handdrawn_current_map"]);
  assert.deepEqual(state.residentCommissions, commissionSnapshot);
  assert.equal(acceptResidentStory(state, CHENGYE_ID).ok, false);
});

test("an accepted main-story task and its manual progress survive save normalization", () => {
  const state = createDeveloperState();
  state.residentStories = {};
  developerDockRegion(state, LUMINOUS_ARCHIPELAGO_ID);
  const accepted = acceptResidentStory(state, CHENGYE_ID);
  const fish = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID)[0];
  updateQuestProgress(state, {
    type: "catch", source: "manual", fish, caught: { sizeTier: "standard" },
    regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "windrest_shallows", timeId: "day", weather: "sunny"
  });

  const restored = migrateState(JSON.parse(JSON.stringify(state)));
  const status = getResidentStoryStatus(restored, CHENGYE_ID);
  assert.equal(status.activeScene.id, accepted.scene.id);
  assert.equal(status.objectiveProgress, 1);
  assert.equal(status.canComplete, false);
});
