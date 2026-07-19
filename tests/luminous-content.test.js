import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH, FISH_ASSET_PURPOSES, LUMINOUS_ARCHIPELAGO_FISH_COUNT, LUMINOUS_ARCHIPELAGO_ID, RODS, SLEEPING_TIDE_BAY_ID,
  getFishHabitat, getRegionFish, getRegionFishingSpots, getRegionObservationSpots, resolveFishAsset
} from "../src/data.js";
import {
  createDeveloperState, createInitialState, developerDockRegion, developerSetRegionEvent,
  generateCatch, getActiveBayEvent, getActiveBayEventState, getFishAppearanceRate, migrateState, recordCatch
} from "../src/core.js";

test("luminous pool contains thirty-three sourced fish assigned only to the archipelago", () => {
  const pool = getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID);

  assert.equal(pool.length, LUMINOUS_ARCHIPELAGO_FISH_COUNT);
  assert.equal(new Set(pool.map(fish => fish.id)).size, LUMINOUS_ARCHIPELAGO_FISH_COUNT);
  assert.ok(pool.every(fish => fish.habitats.length === 1 && fish.habitats[0].regionId === LUMINOUS_ARCHIPELAGO_ID));
  assert.ok(pool.every(fish => !getFishHabitat(fish, SLEEPING_TIDE_BAY_ID)));
  assert.ok(pool.every(fish => fish.scientific.split(" ").length === 2));
  assert.ok(pool.every(fish => fish.ecologySource?.label === "FishBase 物種摘要"));
  assert.ok(pool.every(fish => /^https:\/\/www\.fishbase\.se\/summary\//.test(fish.ecologySource?.url)));
  assert.ok(pool.every(fish => !Number.isNaN(Date.parse(fish.ecologySource?.checkedAt))));
  assert.ok(pool.every(fish => fish.ecologySource?.note.length >= 20));
  assert.deepEqual(Object.fromEntries(["common", "uncommon", "rare"].map(rarity => [
    rarity, pool.filter(fish => fish.rarity === rarity).length
  ])), { common: 16, uncommon: 13, rare: 4 });
  assert.ok(pool.filter(fish => fish.rarity === "rare").every(fish => fish.bodyClass === "large"));
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
    state.timeIndex = ["dawn", "day", "dusk", "night"].indexOf(fish.preferredTimeIds[0] || "dawn");
    state.weather = fish.preferredWeatherIds[0] || "sunny";
    state.selectedSpot = habitat.spotIds[0];
    state.equippedBait = fish.baits[0];
    assert.ok(getFishAppearanceRate(fish, state, habitat.spotIds[0], fish.baits[0]) > 0, fish.id);
    for (const purpose of FISH_ASSET_PURPOSES) {
      const asset = resolveFishAsset(fish, { purpose, variant: "shimmer" });
      assert.equal(asset.source, "svg-fallback");
      assert.equal(asset.variant, "shimmer");
    }
  }
});

test("sleeping and luminous fish remain isolated while local catches record one regional discovery", () => {
  const state = createInitialState();
  const sleepingFish = FISH.find(entry => entry.id === "parrotfish");
  const luminousFish = FISH.find(entry => entry.id === "convict_surgeonfish");
  assert.equal(getFishHabitat(sleepingFish, LUMINOUS_ARCHIPELAGO_ID), null);
  assert.equal(getFishHabitat(luminousFish, SLEEPING_TIDE_BAY_ID), null);

  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  state.world.docking = { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID };
  state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID] = { discoveredFishIds: [] };
  const luminousCatch = generateCatch(luminousFish, {
    regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "windrest_shallows", timeId: "day", weather: "sunny",
    baitId: "shrimp", rodId: "wood", day: state.day
  }, state, () => .5);
  const luminousResult = recordCatch(state, luminousCatch);
  assert.equal(luminousResult.isNew, true);
  assert.equal(luminousResult.isNewRegional, true);
  assert.deepEqual(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].discoveredFishIds, ["convict_surgeonfish"]);
  assert.equal(state.world.regionProgress[SLEEPING_TIDE_BAY_ID].discoveredFishIds.includes(luminousFish.id), false);
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
