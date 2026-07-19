import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_FISHING_EQUIPMENT, DAILY_GOAL_TEMPLATES, FISH, LUMINOUS_ARCHIPELAGO_ID,
  SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  acknowledgeAutoFishing, beginRouteTravel, buyAutoFishingEquipment, buyShip, configureAutoFishing,
  createDeveloperState, createInitialState, developerDockRegion, developerResetAutoFishing,
  developerSimulateAutoFishing, getAchievementProgress, getAutoFishingFishPool,
  getEligibleAutoFishingBaits, getEligibleAutoFishingSpots, markAutoFishingClosed, migrateState,
  recordCatch, sellCatches, settleAutoFishing, stopAutoFishing, switchActiveShip
} from "../src/core.js";
import { createDailyGoalEntry } from "../src/systems/daily-board.js";

const AT = Date.parse("2026-07-18T00:00:00.000Z");
const iso = milliseconds => new Date(AT + milliseconds).toISOString();

function manualCatch(fishId, index = 0, overrides = {}) {
  return {
    uid: `slice-e-manual:${fishId}:${index}`,
    fishId,
    length: 20,
    weight: .3,
    sizeTier: "standard",
    variant: "normal",
    price: 40,
    caughtAt: iso(index * 1000),
    context: {
      regionId: "sleeping_tide_bay",
      spotId: "shore",
      timeId: "dawn",
      weather: "sunny",
      baitId: "bread",
      rodId: "wood",
      day: 1,
      ...overrides
    }
  };
}

function preparedState({ fishIds = ["sardine"], bait = 60 } = {}) {
  const state = createInitialState();
  state.money = 10_000;
  state.tideglow.total = 20;
  assert.equal(buyShip(state, "tidewhisper_residence", iso(0)).ok, true);
  fishIds.forEach((fishId, index) => recordCatch(state, manualCatch(fishId, index)));
  state.baitAmounts.bread = bait;
  assert.equal(buyAutoFishingEquipment(state, iso(1000)).ok, true);
  return state;
}

function arm(state, seed = "slice-e-seed") {
  const result = configureAutoFishing(state, {
    spotId: "shore",
    baitId: "bread",
    seed,
    configuredAt: iso(2000)
  });
  assert.equal(result.ok, true);
  return result.session;
}

function closeAndSettle(state, minutes, openedOffsetMinutes = minutes + 1) {
  assert.equal(markAutoFishingClosed(state, iso(60_000)), true);
  return settleAutoFishing(state, iso(openedOffsetMinutes * 60_000));
}

test("the permanent rack requires Tidewhisper Residence, a dock, and exactly 1,500 coins", () => {
  const state = createInitialState();
  state.money = 10_000;
  assert.equal(buyAutoFishingEquipment(state).reason, "requires-ship");
  state.tideglow.total = 20;
  assert.equal(buyShip(state, "tidewhisper_residence", iso(0)).ok, true);
  state.money = AUTO_FISHING_EQUIPMENT.price - 1;
  assert.equal(buyAutoFishingEquipment(state).reason, "money");
  state.money = 2_000;
  const purchase = buyAutoFishingEquipment(state, iso(1000));
  assert.equal(purchase.ok, true);
  assert.equal(state.money, 500);
  assert.equal(state.autoFishing.owned, true);
  assert.equal(buyAutoFishingEquipment(state).reason, "owned");
  assert.equal(state.autoFishing.activeSession, null);
});

test("configuration only offers caught fishing spots at the current dock and stocked unlocked bait", () => {
  const state = preparedState();
  state.world.regionProgress.sleeping_tide_bay.caughtSpotIds.push("deep");
  state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID] = { caughtSpotIds: ["lagoon"] };
  const spotIds = getEligibleAutoFishingSpots(state).map(spot => spot.id);
  assert.deepEqual(spotIds, ["shore"]);
  assert.ok(!spotIds.includes("starlight_observation_cape"));
  assert.ok(getEligibleAutoFishingBaits(state).some(bait => bait.id === "bread"));
  state.baitAmounts.bread = 0;
  assert.ok(!getEligibleAutoFishingBaits(state).some(bait => bait.id === "bread"));
  assert.equal(configureAutoFishing(state, { spotId: "lagoon", baitId: "bread" }).reason, "invalid-spot");
  state.world.docking = { status: "offshore", regionId: "sleeping_tide_bay" };
  assert.deepEqual(getEligibleAutoFishingSpots(state), []);
});

test("the fish pool contains only discovered common and uncommon fish from the current region", () => {
  const state = preparedState({ fishIds: ["sardine", "threadfin_bream"] });
  const rare = FISH.find(fish => fish.rarity === "rare" && fish.habitats.some(habitat => habitat.regionId === "sleeping_tide_bay"));
  state.discovered[rare.id] = { count: 1, manualCount: 1, autoCount: 0 };
  const pool = getAutoFishingFishPool(state, { regionId: "sleeping_tide_bay", spotId: "shore", baitId: "bread" });
  assert.deepEqual(new Set(pool.map(entry => entry.fish.id)), new Set(["sardine", "threadfin_bream"]));
  assert.ok(pool.every(entry => ["common", "uncommon"].includes(entry.fish.rarity)));
  assert.ok(!pool.some(entry => entry.fish.id === rare.id));
  assert.ok(!pool.some(entry => entry.fish.id === "mackerel"));
});

test("visible and background time never accrue without a real page-close marker", () => {
  const state = preparedState();
  arm(state);
  const inventoryBefore = state.catchInventory.length;
  const baitBefore = state.baitAmounts.bread;
  const result = settleAutoFishing(state, iso(180 * 60_000));
  assert.equal(result.changed, false);
  assert.equal(state.catchInventory.length, inventoryBefore);
  assert.equal(state.baitAmounts.bread, baitBefore);
  assert.equal(state.autoFishing.activeSession.closedAt, null);
});

test("fixed seeds are deterministic and normal settlement consumes one bait per standard normal catch", () => {
  const first = preparedState({ fishIds: ["sardine", "needlefish"] });
  const second = preparedState({ fishIds: ["sardine", "needlefish"] });
  arm(first, "same-seed");
  arm(second, "same-seed");
  const firstResult = closeAndSettle(first, 20, 21);
  const secondResult = closeAndSettle(second, 20, 21);
  assert.equal(firstResult.summary.catchCount, 5);
  assert.equal(firstResult.summary.baitConsumed, 5);
  assert.deepEqual(firstResult.summary.fishCounts, secondResult.summary.fishCounts);
  assert.deepEqual(firstResult.catches, secondResult.catches);
  assert.ok(firstResult.catches.every(caught => caught.source === "auto" && caught.variant === "normal" && caught.sizeTier === "standard"));
  assert.equal(first.baitAmounts.bread, 55);
});

test("offline familiarity is capped while manual totals, records, goals, Tideglow, and journal stay unchanged", () => {
  const state = preparedState({ fishIds: ["sardine"] });
  arm(state);
  const baseline = {
    totalCaught: state.totalCaught,
    recordCatches: state.recordCatches,
    daily: structuredClone(state.dailyBoard),
    commissions: structuredClone(state.residentCommissions),
    achievements: structuredClone(state.achievements),
    familiarProgress: getAchievementProgress(state, "familiar_5"),
    tideglow: structuredClone(state.tideglow),
    journal: structuredClone(state.journal),
    world: structuredClone(state.world),
    events: structuredClone(state.gameEvents)
  };
  const first = closeAndSettle(state, 40, 41);
  assert.equal(first.summary.catchCount, 10);
  assert.equal(state.discovered.sardine.manualCount, 1);
  assert.equal(state.discovered.sardine.autoCount, 3);
  assert.equal(state.discovered.sardine.count, 4);
  assert.equal(state.totalCaught, baseline.totalCaught);
  assert.equal(state.recordCatches, baseline.recordCatches);
  assert.deepEqual(state.dailyBoard, baseline.daily);
  assert.deepEqual(state.residentCommissions, baseline.commissions);
  assert.deepEqual(state.achievements, baseline.achievements);
  assert.deepEqual(getAchievementProgress(state, "familiar_5"), baseline.familiarProgress);
  assert.deepEqual(state.tideglow, baseline.tideglow);
  assert.deepEqual(state.journal, baseline.journal);
  assert.deepEqual(state.world, baseline.world);
  assert.deepEqual(state.gameEvents, baseline.events);

  assert.equal(markAutoFishingClosed(state, iso(50 * 60_000)), true);
  settleAutoFishing(state, iso(90 * 60_000));
  assert.equal(state.discovered.sardine.count, 4);
  assert.equal(state.discovered.sardine.autoCount, 3);
  const reloaded = migrateState(structuredClone(state));
  assert.equal(reloaded.totalCaught, 1);
  assert.equal(reloaded.discovered.sardine.manualCount, 1);
  assert.equal(reloaded.discovered.sardine.autoCount, 3);
});

test("selling automatic catches later advances ordinary manual sell goals", () => {
  const state = preparedState();
  const template = DAILY_GOAL_TEMPLATES.find(entry => entry.condition.eventType === "sell");
  state.dailyBoard.entries = [createDailyGoalEntry(template, state.day, 0)];
  arm(state);
  const result = closeAndSettle(state, 20, 21);
  assert.equal(state.dailyBoard.entries[0].progress, 0);
  const sale = sellCatches(state, result.catches.map(caught => caught.uid));
  assert.equal(sale.sold, result.catches.length);
  assert.ok(state.dailyBoard.entries[0].progress > 0);
});

test("settlement is atomic and idempotent across repeated opens and replayed close markers", () => {
  const state = preparedState();
  arm(state);
  assert.equal(markAutoFishingClosed(state, iso(60_000)), true);
  const closedAt = state.autoFishing.activeSession.closedAt;
  const first = settleAutoFishing(state, iso(21 * 60_000));
  const count = state.catchInventory.length;
  const bait = state.baitAmounts.bread;
  const second = settleAutoFishing(state, iso(22 * 60_000));
  assert.equal(second.changed, false);
  assert.equal(state.catchInventory.length, count);
  assert.equal(state.baitAmounts.bread, bait);
  state.autoFishing.activeSession.closedAt = closedAt;
  const replay = settleAutoFishing(state, iso(23 * 60_000));
  assert.equal(replay.duplicate, true);
  assert.equal(state.catchInventory.length, count);
  assert.equal(state.baitAmounts.bread, bait);
  assert.equal(acknowledgeAutoFishing(state, first.summary.id), true);
  assert.equal(settleAutoFishing(state, iso(24 * 60_000)).summary, null);
});

test("three-hour, bait-empty, early-return, and clock-rollback outcomes stop or continue safely", () => {
  const limited = preparedState();
  arm(limited);
  const limitResult = closeAndSettle(limited, 181, 182);
  assert.equal(limitResult.summary.catchCount, AUTO_FISHING_EQUIPMENT.maxCatchCount);
  assert.equal(limitResult.summary.countedMs, AUTO_FISHING_EQUIPMENT.maxOfflineMs);
  assert.equal(limitResult.summary.stopReason, "three-hour-limit");
  assert.equal(limited.autoFishing.activeSession, null);

  const empty = preparedState({ bait: 2 });
  arm(empty);
  const emptyResult = closeAndSettle(empty, 20, 21);
  assert.equal(emptyResult.summary.catchCount, 2);
  assert.equal(emptyResult.summary.stopReason, "bait-empty");
  assert.equal(empty.autoFishing.activeSession, null);

  const early = preparedState();
  arm(early);
  const earlyResult = closeAndSettle(early, 1, 2);
  assert.equal(earlyResult.summary.catchCount, 0);
  assert.equal(earlyResult.summary.stopReason, "returned-early");
  assert.ok(early.autoFishing.activeSession);

  const rollback = preparedState();
  arm(rollback);
  assert.equal(markAutoFishingClosed(rollback, iso(10 * 60_000)), true);
  const rollbackResult = settleAutoFishing(rollback, iso(5 * 60_000));
  assert.equal(rollbackResult.summary.catchCount, 0);
  assert.equal(rollbackResult.summary.stopReason, "clock-rollback");
  assert.ok(rollback.autoFishing.activeSession);
});

test("departing, changing ports, manual stop, and ship switching keep the rack safe", () => {
  const sailing = preparedState();
  arm(sailing);
  assert.equal(beginRouteTravel(sailing, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, AT).ok, true);
  assert.equal(sailing.autoFishing.activeSession, null);

  const developer = createDeveloperState();
  developerResetAutoFishing(developer, true);
  const spots = getEligibleAutoFishingSpots(developer);
  const baits = getEligibleAutoFishingBaits(developer);
  assert.ok(spots.length && baits.length);
  assert.equal(configureAutoFishing(developer, { spotId: spots[0].id, baitId: baits[0].id, seed: "dev" }).ok, true);
  assert.equal(switchActiveShip(developer, "tidewhisper_residence").ok, true);
  assert.equal(developer.autoFishing.activeSession.shipId, "tidewhisper_residence");
  assert.equal(developerDockRegion(developer, LUMINOUS_ARCHIPELAGO_ID), true);
  assert.equal(developer.autoFishing.activeSession, null);

  const manual = preparedState();
  arm(manual);
  assert.equal(stopAutoFishing(manual).ok, true);
  assert.equal(manual.autoFishing.activeSession, null);
});

test("developer controls reset ownership and simulate deterministic offline reasons", () => {
  const state = createDeveloperState();
  assert.equal(developerResetAutoFishing(state, false), true);
  assert.equal(state.autoFishing.owned, false);
  assert.equal(developerResetAutoFishing(state, true), true);
  const spot = getEligibleAutoFishingSpots(state)[0];
  const bait = getEligibleAutoFishingBaits(state)[0];
  assert.equal(configureAutoFishing(state, { spotId: spot.id, baitId: bait.id, seed: "developer-fixed" }).ok, true);
  const normal = developerSimulateAutoFishing(state, { durationMs: 20 * 60_000, openedAt: iso(60 * 60_000) });
  assert.equal(normal.ok, true);
  assert.equal(normal.summary.stopReason, "returned");
  const rollback = developerSimulateAutoFishing(state, { durationMs: -5 * 60_000, openedAt: iso(70 * 60_000) });
  assert.equal(rollback.ok, true);
  assert.equal(rollback.summary.stopReason, "clock-rollback");

  const empty = developerSimulateAutoFishing(state, { stopReason: "bait-empty", openedAt: iso(80 * 60_000) });
  assert.equal(empty.summary.stopReason, "bait-empty");
  assert.equal(state.autoFishing.activeSession, null);

  state.baitAmounts[bait.id] = 999;
  assert.equal(configureAutoFishing(state, { spotId: spot.id, baitId: bait.id, seed: "developer-no-fish" }).ok, true);
  const noFish = developerSimulateAutoFishing(state, { stopReason: "no-eligible-fish", openedAt: iso(90 * 60_000) });
  assert.equal(noFish.summary.stopReason, "no-eligible-fish");

  assert.equal(configureAutoFishing(state, { spotId: spot.id, baitId: bait.id, seed: "developer-region" }).ok, true);
  const changed = developerSimulateAutoFishing(state, { stopReason: "region-changed", openedAt: iso(100 * 60_000) });
  assert.equal(changed.summary.stopReason, "region-changed");

  assert.equal(configureAutoFishing(state, { spotId: spot.id, baitId: bait.id, seed: "developer-depart" }).ok, true);
  const departed = developerSimulateAutoFishing(state, { stopReason: "departed" });
  assert.equal(departed.stopReason, "departed");
  assert.equal(state.autoFishing.activeSession, null);
});

test("same-version alpha.4 saves normalize rack state and legacy familiarity without retroactive progress", () => {
  const alpha4 = createInitialState();
  alpha4.discovered.sardine = { count: 5, firstCaught: iso(0), bestLength: 20, bestWeight: .3 };
  alpha4.totalCaught = 5;
  alpha4.autoFishing = { owned: false, activeSession: null, lastSummary: null, settledSessionIds: [] };
  const migrated = migrateState(alpha4);
  assert.equal(migrated.autoFishing.version, 1);
  assert.equal(migrated.discovered.sardine.manualCount, 5);
  assert.equal(migrated.discovered.sardine.autoCount, 0);
  assert.equal(migrated.totalCaught, 5);
});
