import test from "node:test";
import assert from "node:assert/strict";
import {
  BAY_EVENTS, FISH, LUMINOUS_ARCHIPELAGO_ID, REGIONS, REGION_SPOTS, ROUTES,
  SLEEPING_TIDE_BAY_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, getFishHabitat,
  getRegionFish, getRegionFishingSpots, getRegionObservationSpots, getRegionSpots,
  getRoutesForRegion, isRouteAvailable
} from "../src/data.js";
import {
  createDeveloperState, createInitialState, generateCatch, getActiveBayEvent, migrateState, recordCatch
} from "../src/core.js";
import {
  createDeveloperWorldState, createInitialWorldState, hasRegionalDiscovery,
  normalizeWorldState, recordRegionalDiscovery
} from "../src/systems/world-state.js";

test("sleeping tide bay packages all legacy spots, fish habitats, and bay events", () => {
  const sleepingTide = REGIONS.find(region => region.id === SLEEPING_TIDE_BAY_ID);
  assert.equal(sleepingTide.status, "available");
  assert.deepEqual(sleepingTide.spotIds, ["shore", "reef", "deep"]);
  assert.equal(getRegionSpots(SLEEPING_TIDE_BAY_ID).length, 3);
  assert.equal(getRegionSpots(SLEEPING_TIDE_BAY_ID).every(spot => spot.regionId === SLEEPING_TIDE_BAY_ID), true);
  assert.equal(getRegionFish(FISH, SLEEPING_TIDE_BAY_ID).length, 30);
  assert.equal(FISH.slice(0, 30).every(fish => getFishHabitat(fish, SLEEPING_TIDE_BAY_ID)), true);
  assert.equal(BAY_EVENTS.filter(event => event.regionId === SLEEPING_TIDE_BAY_ID).length, 3);
});

test("Slice F completes luminous fishing content while preserving the Slice E route", () => {
  const luminous = REGIONS.find(region => region.id === LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(luminous.status, "available");
  assert.equal(luminous.contentStatus, "complete");
  assert.deepEqual(luminous.spotIds, ["windrest_shallows", "prism_coral_garden", "warm_current_channel", "starlight_observation_cape"]);
  assert.equal(getRegionFishingSpots(LUMINOUS_ARCHIPELAGO_ID).length, 3);
  assert.equal(getRegionObservationSpots(LUMINOUS_ARCHIPELAGO_ID).length, 1);
  assert.equal(getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID).length, 15);
  assert.equal(getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID).filter(fish => !getFishHabitat(fish, SLEEPING_TIDE_BAY_ID)).length, 11);
  assert.equal(getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID).filter(fish => getFishHabitat(fish, SLEEPING_TIDE_BAY_ID)).length, 4);
  assert.equal(getRegionFish(FISH, LUMINOUS_ARCHIPELAGO_ID).some(fish => fish.spots.includes("starlight_observation_cape")), false);
  assert.equal(ROUTES.length, 1);
  assert.equal(ROUTES[0].id, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID);
  assert.equal(ROUTES[0].status, "available");
  assert.equal(ROUTES[0].distanceClass, "short");
  assert.equal(isRouteAvailable(ROUTES[0].id), true);
  assert.deepEqual(getRoutesForRegion(SLEEPING_TIDE_BAY_ID), ROUTES);
  assert.deepEqual(getRoutesForRegion(SLEEPING_TIDE_BAY_ID, { includePreview: true }), ROUTES);
});

test("fish habitat queries support multiple regions without duplicating a species", () => {
  const fish = structuredClone(FISH[0]);
  fish.habitats.push({
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    spotIds: ["future-lagoon"],
    timeIds: ["dusk"],
    weatherIds: ["sunny"],
    baseWeight: .7,
    sizeScale: 1.08
  });
  assert.equal(getFishHabitat(fish, SLEEPING_TIDE_BAY_ID).baseWeight, 1);
  assert.equal(getFishHabitat(fish, LUMINOUS_ARCHIPELAGO_ID).sizeScale, 1.08);
  assert.equal(new Set([fish.id]).size, 1);
});

test("new and developer games only unlock currently implemented world content", () => {
  const initial = createInitialWorldState();
  assert.equal(initial.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(initial.visitedRegionIds, [SLEEPING_TIDE_BAY_ID]);
  assert.deepEqual(initial.unlockedRouteIds, [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID]);
  assert.deepEqual(initial.completedRouteIds, []);
  assert.deepEqual(initial.docking, { status: "docked", regionId: SLEEPING_TIDE_BAY_ID });
  assert.equal(initial.travel, null);

  const developer = createDeveloperWorldState({ discoveredFishIds: FISH.map(fish => fish.id) });
  assert.deepEqual(developer.visitedRegionIds, [SLEEPING_TIDE_BAY_ID, LUMINOUS_ARCHIPELAGO_ID]);
  assert.deepEqual(developer.unlockedRouteIds, [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID]);
  assert.deepEqual(developer.completedRouteIds, []);
  assert.equal(developer.regionProgress[SLEEPING_TIDE_BAY_ID].discoveredFishIds.length, 30);
  assert.equal(developer.regionProgress[LUMINOUS_ARCHIPELAGO_ID].discoveredFishIds.length, 15);
  assert.deepEqual(createInitialState().world, initial);
  assert.deepEqual(createDeveloperState().world, developer);
});

test("v1 through v3 migration adds v4 world state without changing collection values", () => {
  const raw = {
    version: 3,
    money: 765,
    totalCaught: 7,
    discovered: {
      sardine: { count: 4, bestLength: 20, bestWeight: .2 },
      anchovy: { count: 3, bestLength: 15, bestWeight: .1 }
    },
    currentQuests: [{
      id: "common3", instanceId: "1-0-common3", text: "捕獲 3 條常見魚",
      type: "rarity", target: "common", progress: 2, goal: 3, reward: 85, claimed: false
    }]
  };
  const migrated = migrateState(raw);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.money, raw.money);
  assert.equal(migrated.totalCaught, raw.totalCaught);
  assert.deepEqual(Object.keys(migrated.discovered), ["sardine", "anchovy"]);
  assert.equal(migrated.currentQuests, undefined);
  assert.deepEqual(
    migrated.dailyBoard.entries.map(entry => ({ instanceId: entry.instanceId, progress: entry.progress, claimed: entry.claimed })),
    raw.currentQuests.map(entry => ({ instanceId: entry.instanceId, progress: entry.progress, claimed: entry.claimed }))
  );
  assert.equal(migrated.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(migrated.world.regionProgress[SLEEPING_TIDE_BAY_ID].discoveredFishIds, ["sardine", "anchovy"]);

  const reloaded = migrateState(JSON.parse(JSON.stringify(migrated)));
  assert.deepEqual(reloaded.world, migrated.world);
  assert.deepEqual(reloaded.dailyBoard, migrated.dailyBoard);
  assert.equal(reloaded.money, migrated.money);
});

test("unknown world content and broken travel safely return to a valid dock", () => {
  const repaired = normalizeWorldState({
    currentRegionId: "deleted-region",
    visitedRegionIds: ["deleted-region", LUMINOUS_ARCHIPELAGO_ID],
    unlockedRouteIds: ["deleted-route", SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID],
    regionProgress: { "deleted-region": { discoveredFishIds: ["sardine"] } },
    travel: {
      routeId: "deleted-route",
      fromRegionId: "deleted-region",
      toRegionId: LUMINOUS_ARCHIPELAGO_ID,
      segment: 99
    },
    docking: { status: "offshore", regionId: "deleted-region" }
  });
  assert.equal(repaired.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(repaired.visitedRegionIds, [SLEEPING_TIDE_BAY_ID, LUMINOUS_ARCHIPELAGO_ID]);
  assert.deepEqual(repaired.unlockedRouteIds, [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID]);
  assert.equal(repaired.travel, null);
  assert.deepEqual(repaired.docking, { status: "docked", regionId: SLEEPING_TIDE_BAY_ID });
});

test("regional discoveries are recorded once and bay events remain region-scoped", () => {
  const state = createInitialState();
  const caught = generateCatch(FISH[0], {
    regionId: SLEEPING_TIDE_BAY_ID,
    spotId: "shore",
    timeId: "dawn",
    weather: "sunny",
    baitId: "bread",
    rodId: "wood",
    day: 1
  }, state, () => .5);
  const result = recordCatch(state, caught);
  assert.equal(result.isNewRegional, true);
  assert.equal(hasRegionalDiscovery(state.world, FISH[0].id, SLEEPING_TIDE_BAY_ID), true);
  assert.equal(recordRegionalDiscovery(state.world, FISH[0].id, SLEEPING_TIDE_BAY_ID).isNewRegional, false);

  state.world.currentRegionId = LUMINOUS_ARCHIPELAGO_ID;
  assert.equal(getActiveBayEvent(state)?.id, "prism_sunshower");
  assert.equal(getActiveBayEvent(state)?.regionId, LUMINOUS_ARCHIPELAGO_ID);
});
