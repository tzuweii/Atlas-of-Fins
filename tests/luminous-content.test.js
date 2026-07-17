import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH, FISH_ASSET_PURPOSES, LUMINOUS_ARCHIPELAGO_ID, RODS, SLEEPING_TIDE_BAY_ID,
  getFishHabitat, getRegionFish, getRegionFishingSpots, getRegionObservationSpots, resolveFishAsset
} from "../src/data.js";
import {
  createDeveloperState, createInitialState, developerDockRegion, developerSetRegionEvent,
  fishWeight, generateCatch, getActiveBayEvent, getActiveBayEventState, migrateState, recordCatch
} from "../src/core.js";

const SHARED_FISH_IDS = ["parrotfish", "surgeonfish", "mahi", "flyingfish"];

test("luminous pool contains eleven sourced new fish and four ecological cross-region fish", () => {
  const pool = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID);
  const original = pool.filter(fish => !getFishHabitat(fish, SLEEPING_TIDE_BAY_ID));
  const shared = pool.filter(fish => getFishHabitat(fish, SLEEPING_TIDE_BAY_ID));

  assert.equal(pool.length, 15);
  assert.equal(original.length, 11);
  assert.deepEqual(shared.map(fish => fish.id).sort(), [...SHARED_FISH_IDS].sort());
  assert.equal(new Set(pool.map(fish => fish.id)).size, 15);
  assert.ok(original.every(fish => fish.scientific.split(" ").length === 2));
  assert.ok(original.every(fish => fish.ecologySource?.label === "FishBase 物種摘要"));
  assert.ok(original.every(fish => /^https:\/\/www\.fishbase\.se\/summary\//.test(fish.ecologySource?.url)));
});

test("every luminous fish has a reachable fishing condition and SVG fallback coverage", () => {
  const fishingSpotIds = new Set(getRegionFishingSpots(LUMINOUS_ARCHIPELAGO_ID).map(spot => spot.id));
  const observationSpotIds = new Set(getRegionObservationSpots(LUMINOUS_ARCHIPELAGO_ID).map(spot => spot.id));
  const state = createInitialState();
  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };
  state.ownedRods = RODS.map(rod => rod.id);
  state.equippedRod = "farcast";
  state.regionEvents[LUMINOUS_ARCHIPELAGO_ID] = null;

  for (const fish of getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID)) {
    const habitat = getFishHabitat(fish, LUMINOUS_ARCHIPELAGO_ID);
    assert.ok(habitat.spotIds.length > 0);
    assert.ok(habitat.spotIds.every(spotId => fishingSpotIds.has(spotId)));
    assert.ok(habitat.spotIds.every(spotId => !observationSpotIds.has(spotId)));
    state.timeIndex = ["dawn", "day", "dusk", "night"].indexOf(habitat.timeIds[0]);
    state.weather = habitat.weatherIds[0];
    state.selectedSpot = habitat.spotIds[0];
    state.equippedBait = fish.baits[0];
    assert.ok(fishWeight(fish, state, habitat.spotIds[0], fish.baits[0]) > 0, fish.id);
    for (const purpose of FISH_ASSET_PURPOSES) {
      const asset = resolveFishAsset(fish, { purpose, variant: "shimmer" });
      assert.equal(asset.source, "svg-fallback");
      assert.equal(asset.variant, "shimmer");
    }
  }
});

test("a shared fish receives its luminous stamp only after a local catch", () => {
  const state = createInitialState();
  const fish = FISH.find(entry => entry.id === "parrotfish");
  const sleepingCatch = generateCatch(fish, {
    regionId: SLEEPING_TIDE_BAY_ID, spotId: "reef", timeId: "day", weather: "sunny",
    baitId: "shrimp", rodId: "wood", day: state.day
  }, state, () => .5);
  const sleepingResult = recordCatch(state, sleepingCatch);
  assert.equal(sleepingResult.isNew, true);
  assert.equal(sleepingResult.isNewRegional, true);
  assert.equal(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID], undefined);

  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };
  const luminousCatch = generateCatch(fish, {
    regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "prism_coral_garden", timeId: "day", weather: "sunny",
    baitId: "shrimp", rodId: "wood", day: state.day
  }, state, () => .5);
  const luminousResult = recordCatch(state, luminousCatch);
  assert.equal(luminousResult.isNew, false);
  assert.equal(luminousResult.isNewRegional, true);
  assert.deepEqual(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].discoveredFishIds, ["parrotfish"]);
});

test("regional event state migrates independently for both ports", () => {
  const state = createInitialState();
  state.regionEvents[LUMINOUS_ARCHIPELAGO_ID].progress = 1;
  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };

  const migrated = migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(migrated.bayEvent.eventId, "silver_tide");
  assert.equal(migrated.bayEvent.progress, 0);
  assert.equal(migrated.regionEvents[LUMINOUS_ARCHIPELAGO_ID].eventId, "prism_sunshower");
  assert.equal(migrated.regionEvents[LUMINOUS_ARCHIPELAGO_ID].progress, 1);
  assert.equal(getActiveBayEvent(migrated).id, "prism_sunshower");
  assert.equal(getActiveBayEventState(migrated).progress, 1);
});

test("developer region controls dock safely and select only local events", () => {
  const state = createDeveloperState();
  assert.equal(developerDockRegion(state, LUMINOUS_ARCHIPELAGO_ID), true);
  assert.equal(state.world.currentRegionId, LUMINOUS_ARCHIPELAGO_ID);
  assert.deepEqual(state.world.docking, { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID });
  assert.equal(state.selectedSpot, "windrest_shallows");
  assert.equal(developerSetRegionEvent(state, "coral_rainveil"), true);
  assert.equal(getActiveBayEvent(state).id, "coral_rainveil");
  assert.equal(state.weather, "rain");
  assert.equal(developerSetRegionEvent(state, "silver_tide"), false);
  assert.equal(developerDockRegion(createInitialState(), LUMINOUS_ARCHIPELAGO_ID), false);
});
