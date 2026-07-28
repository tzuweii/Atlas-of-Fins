import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_APPEARANCE_BUDGETS, BAITS, BAY_EVENTS, CAPTURE_RATE_BY_RARITY, FISH,
  FISH_APPEARANCE_WEIGHT_RANGE, HIGH_TIER_APPEARANCE_SPLITS, RARITY, RODS, SPOTS, TIMES,
  cascadeHighTierSplit, fishCanAppearAtSpot, getFishHabitat
} from "../src/data.js";
import {
  chooseFish, createInitialState, getFishAppearanceTable, getUnboostedFishAppearanceRate,
  getUnboostedSingleCastSuccessRate, rollCaptureSuccess
} from "../src/core.js";

const fishingSpots = SPOTS.filter(spot => (spot.activityType || "fishing") === "fishing");
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);

function stateAtSpot(spot) {
  const state = createInitialState();
  state.world.currentRegionId = spot.regionId;
  state.world.docking = { status: "docked", regionId: spot.regionId };
  state.selectedSpot = spot.id;
  state.equippedRod = "wood";
  state.bayEvent = null;
  state.regionEvents[spot.regionId] = null;
  return state;
}

function tierTotal(table, rarity, field = "finalRate") {
  return table.entries.filter(entry => entry.fish.rarity === rarity).reduce((sum, entry) => sum + entry[field], 0);
}

function highTierTotal(table, field = "finalRate") {
  return table.entries
    .filter(entry => !["common", "uncommon"].includes(entry.fish.rarity))
    .reduce((sum, entry) => sum + entry[field], 0);
}

test("fixed top-level budgets and capture rates match the approved architecture", () => {
  near(Object.values(BASE_APPEARANCE_BUDGETS).reduce((sum, value) => sum + value, 0), 1);
  assert.deepEqual(BASE_APPEARANCE_BUDGETS, { common: .6, uncommon: .3, highTier: .06, noBite: .04 });
  assert.deepEqual(CAPTURE_RATE_BY_RARITY, {
    common: .9, uncommon: .7, rare: .6, epic: .5, legendary: .45, mythic: .4, miracle: .35
  });
  for (const split of Object.values(HIGH_TIER_APPEARANCE_SPLITS)) {
    near(Object.values(split).reduce((sum, value) => sum + value, 0), 1);
  }
  const missingEpic = cascadeHighTierSplit("legendary", ["rare", "legendary"]);
  near(missingEpic.rare, .9);
  near(missingEpic.legendary, .1);
  near(Object.values(missingEpic).reduce((sum, value) => sum + value, 0), 1);
  const onlyEpicAndMythic = cascadeHighTierSplit("mythic", ["epic", "mythic"]);
  near(onlyEpicAndMythic.epic, .94);
  near(onlyEpicAndMythic.mythic, .06);
  near(Object.values(onlyEpicAndMythic).reduce((sum, value) => sum + value, 0), 1);
});

test("all current fish use bounded relative weights instead of absolute rates", () => {
  for (const fish of FISH) {
    assert.ok(fish.appearanceWeight >= FISH_APPEARANCE_WEIGHT_RANGE.min, fish.id);
    assert.ok(fish.appearanceWeight <= FISH_APPEARANCE_WEIGHT_RANGE.max, fish.id);
    assert.equal(Object.hasOwn(fish, "baseAppearanceRate"), false, fish.id);
    const habitat = fish.habitats[0];
    const spotId = habitat.spotIds[0];
    const appearance = getUnboostedFishAppearanceRate(fish, habitat.regionId, spotId);
    near(getUnboostedSingleCastSuccessRate(fish, habitat.regionId, spotId), appearance * RARITY[fish.rarity].catchRate);
  }
});

test("common and uncommon fish are region-shared while high-tier fish stay spot-bound", () => {
  for (const spot of fishingSpots) {
    const regionFish = FISH.filter(fish => Boolean(getFishHabitat(fish, spot.regionId)));
    const expected = regionFish.filter(fish => fishCanAppearAtSpot(fish, spot.regionId, spot.id));
    const table = getFishAppearanceTable(stateAtSpot(spot));
    assert.deepEqual(new Set(table.entries.map(entry => entry.fish.id)), new Set(expected.map(fish => fish.id)), spot.id);
    near(tierTotal(table, "common", "baseRate"), .6);
    near(tierTotal(table, "uncommon", "baseRate"), .3);
    near(highTierTotal(table, "baseRate"), .06);
    near(table.baseTotal, .96);
    near(table.noBiteRate, .04);
  }
  assert.deepEqual(Object.fromEntries(fishingSpots.map(spot => [
    spot.id,
    FISH.filter(fish => fish.rarity === "rare" && fishCanAppearAtSpot(fish, spot.regionId, spot.id)).length
  ])), {
    shore: 1,
    reef: 1,
    deep: 3,
    windrest_shallows: 1,
    prism_coral_garden: 1,
    warm_current_channel: 2,
    fogfront_shelf: 1,
    whispering_kelp_forest: 2,
    bluecold_trench: 1
  });
});

test("same-tier weights create distinct ordered base rates without changing the tier budget", () => {
  for (const spot of fishingSpots) {
    const table = getFishAppearanceTable(stateAtSpot(spot));
    for (const rarity of ["common", "uncommon", "rare"]) {
      const entries = table.entries.filter(entry => entry.fish.rarity === rarity);
      for (const left of entries) for (const right of entries) {
        if (left.baseWeight > right.baseWeight) assert.ok(left.baseRate > right.baseRate, `${spot.id}/${rarity}/${left.fish.id}`);
        if (left.baseWeight === right.baseWeight) near(left.baseRate, right.baseRate);
      }
    }
  }
});

test("rod, bait, time, weather, and event bonuses preserve the fixed total budget", () => {
  for (const spot of fishingSpots) {
    const state = stateAtSpot(spot);
    for (const rod of RODS) for (const bait of BAITS) for (let timeIndex = 0; timeIndex < TIMES.length; timeIndex += 1) for (const weather of ["sunny", "rain"]) {
      state.equippedRod = rod.id;
      state.equippedBait = bait.id;
      state.timeIndex = timeIndex;
      state.weather = weather;
      const table = getFishAppearanceTable(state);
      const highTier = BASE_APPEARANCE_BUDGETS.highTier * (1 + rod.appearanceBonus);
      near(table.fishRate, .96);
      near(table.noBiteRate, .04);
      near(tierTotal(table, "common"), BASE_APPEARANCE_BUDGETS.common - (highTier - BASE_APPEARANCE_BUDGETS.highTier));
      near(tierTotal(table, "uncommon"), .3);
      near(highTierTotal(table), highTier);
    }
  }
});

test("regional events only redistribute their target rarity pool", () => {
  for (const event of BAY_EVENTS) {
    const spot = fishingSpots.find(candidate => event.spotIds.includes(candidate.id));
    const state = stateAtSpot(spot);
    state.day = 99;
    state.timeIndex = Math.max(0, TIMES.findIndex(entry => entry.id === event.timeIds?.[0]));
    state.weather = event.weatherIds?.[0] || "sunny";
    const eventState = { day: state.day, eventId: event.id, progress: 0, completedAt: null };
    if (event.regionId === "sleeping_tide_bay") state.bayEvent = eventState;
    else state.regionEvents[event.regionId] = eventState;
    const active = getFishAppearanceTable(state);
    if (event.regionId === "sleeping_tide_bay") state.bayEvent = null;
    else state.regionEvents[event.regionId] = null;
    const quiet = getFishAppearanceTable(state);
    const target = active.entries.find(entry => event.fishIds.includes(entry.fish.id)
      && active.entries.some(other => other.fish.rarity === entry.fish.rarity && !event.fishIds.includes(other.fish.id)));
    assert.ok(target, `${event.id} has a target with same-tier competition`);
    const quietTarget = quiet.entries.find(entry => entry.fish.id === target.fish.id);
    assert.ok(target.finalRate > quietTarget.finalRate, event.id);
    near(target.baseRate, quietTarget.baseRate);
    near(tierTotal(active, target.fish.rarity), tierTotal(quiet, target.fish.rarity));
    near(active.noBiteRate, .04);
  }
});

test("the chooser reserves the final four percent for no bite", () => {
  const state = stateAtSpot(fishingSpots.find(spot => spot.id === "deep"));
  const table = getFishAppearanceTable(state);
  near(table.fishRate, .96);
  assert.ok(chooseFish(state, () => .959999));
  assert.equal(chooseFish(state, () => .96), null);
  assert.equal(chooseFish(state, () => 1), null);
});

test("ten-thousand-cast Monte Carlo stays near the designed result at every spot", () => {
  let seed = 20260720;
  const random = () => {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  for (const spot of fishingSpots) {
    const state = stateAtSpot(spot);
    const result = { common: 0, uncommon: 0, rare: 0, escaped: 0, noBite: 0 };
    for (let cast = 0; cast < 10000; cast += 1) {
      const fish = chooseFish(state, random);
      if (!fish) {
        result.noBite += 1;
      } else if (rollCaptureSuccess(fish, RODS[0], random).success) {
        result[fish.rarity] += 1;
      } else {
        result.escaped += 1;
      }
    }
    assert.ok(Math.abs(result.common - 5400) < 220, `${spot.id} common ${result.common}`);
    assert.ok(Math.abs(result.uncommon - 2100) < 180, `${spot.id} uncommon ${result.uncommon}`);
    assert.ok(Math.abs(result.rare - 360) < 90, `${spot.id} rare ${result.rare}`);
    assert.ok(Math.abs(result.escaped - 1740) < 180, `${spot.id} escaped ${result.escaped}`);
    assert.ok(Math.abs(result.noBite - 400) < 90, `${spot.id} no-bite ${result.noBite}`);
  }
});
