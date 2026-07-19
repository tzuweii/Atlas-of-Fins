import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_FISHING_EQUIPMENT, BAITS, FISH, FURNITURE, LUMINOUS_ARCHIPELAGO_ID, RARITY,
  RODS, ROUTES, SHIPS, SHIP_FURNITURE, SLEEPING_TIDE_BAY_ID,
  SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  activeShipSpeed, beginRouteTravel, buyAutoFishingEquipment, buyShip, configureAutoFishing,
  createDeveloperState, createInitialState, dispatchGameEvent, dockAtDestination, getJournalEntries,
  getRouteDurationForState, markAutoFishingClosed, migrateState, progressTravel,
  recordCatch, sellCatches, settleAutoFishing, shipInterior, stopAutoFishing, switchActiveShip
} from "../src/core.js";
import { RECENT_GAME_EVENT_LIMIT } from "../src/systems/game-events.js";

const BASE_TIME = Date.parse("2026-07-18T00:00:00.000Z");
const iso = milliseconds => new Date(BASE_TIME + milliseconds).toISOString();

function economicCatch(fish, habitat, index) {
  return {
    uid: `slice-f-economy:${index}:${fish.id}`,
    fishId: fish.id,
    length: fish.minLength,
    weight: fish.minWeight,
    sizeTier: "standard",
    variant: "normal",
    price: Math.round(fish.basePrice * RARITY[fish.rarity].multiplier),
    caughtAt: iso(index * 1000),
    context: {
      regionId: habitat.regionId,
      spotId: habitat.spotIds[0],
      timeId: habitat.timeIds[0],
      weather: habitat.weatherIds[0],
      baitId: "bread",
      rodId: "farcast",
      day: 1
    }
  };
}

function catchAndSell(state, fish, regionId, index) {
  const habitat = fish.habitats.find(entry => entry.regionId === regionId);
  const caught = economicCatch(fish, habitat, index);
  recordCatch(state, caught);
  sellCatches(state, [caught.uid]);
}

test("a conservative normal-play economy reaches 20/50 Tideglow and all Slice E purchases without reward claims", () => {
  const state = createInitialState();
  const paidRodCost = RODS.reduce((sum, rod) => sum + rod.price, 0);
  const bread = BAITS.find(bait => bait.id === "bread");
  const catchesInRoute = 45;
  const extraBreadNeeded = Math.max(0, catchesInRoute - state.baitAmounts.bread);
  const breadPacks = Math.ceil(extraBreadNeeded / bread.amount);
  const baitReserveCost = breadPacks * bread.price;
  state.money -= paidRodCost + baitReserveCost;
  state.ownedRods = RODS.map(rod => rod.id);
  state.baitAmounts.bread += breadPacks * bread.amount;

  const bayFish = FISH.filter(fish => fish.habitats.some(habitat => habitat.regionId === SLEEPING_TIDE_BAY_ID));
  bayFish.slice(0, 20).forEach((fish, index) => catchAndSell(state, fish, SLEEPING_TIDE_BAY_ID, index));
  assert.equal(state.tideglow.total, 20);
  assert.equal(state.money, 5_862);
  assert.equal(buyShip(state, "tidewhisper_residence", iso(30_000)).ok, true);
  assert.equal(state.money, 4_062);

  bayFish.slice(20).forEach((fish, index) => catchAndSell(state, fish, SLEEPING_TIDE_BAY_ID, index + 20));
  assert.equal(state.tideglow.total, 30);
  assert.equal(state.money, 8_719);
  assert.equal(buyAutoFishingEquipment(state, iso(60_000)).ok, true);
  assert.equal(state.money, 7_219);

  const departedAt = BASE_TIME + 100_000;
  assert.equal(beginRouteTravel(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, departedAt).ok, true);
  const duration = state.world.travel.durationMs;
  assert.equal(progressTravel(state, departedAt + duration + 1).arrived, true);
  assert.equal(dockAtDestination(state, departedAt + duration + 2).ok, true);
  assert.equal(state.tideglow.total, 37);

  const luminousFish = FISH.filter(fish => fish.habitats.some(habitat => habitat.regionId === LUMINOUS_ARCHIPELAGO_ID));
  luminousFish.forEach((fish, index) => catchAndSell(state, fish, LUMINOUS_ARCHIPELAGO_ID, index + 30));
  assert.equal(state.tideglow.total, 78);
  assert.equal(state.money, 22_429);
  assert.equal(buyShip(state, "voyager_study", iso(200_000)).ok, true);
  assert.equal(state.money, 18_229);
  assert.deepEqual(state.ships.ownedShipIds, ["drifting_home", "tidewhisper_residence", "voyager_study"]);
  assert.equal(state.autoFishing.owned, true);
  assert.equal(Object.keys(state.achievements).some(id => state.achievements[id]?.claimed), false);
});

test("ship furniture keeps fixed +15/+30 percent prices and the complete catalog remains affordable by the model", () => {
  const starterByBase = new Map(FURNITURE.map(item => [item.id, item]));
  for (const item of SHIP_FURNITURE.filter(entry => entry.shipId !== "drifting_home")) {
    const base = starterByBase.get(item.baseItemId);
    assert.ok(base);
    assert.equal(item.price, Math.round(base.price * item.priceTier / 10) * 10);
    assert.ok([1.15, 1.3].includes(item.priceTier));
  }
  const catalogTotal = SHIP_FURNITURE.reduce((sum, item) => sum + item.price, 0);
  assert.equal(catalogTotal, 7_970);
  assert.ok(18_229 >= catalogTotal);
});

test("the starter ship can complete every implemented route while later ships only shorten time gently", () => {
  const starter = createInitialState();
  for (const route of ROUTES.filter(entry => entry.status === "available")) {
    assert.ok([route.fromRegionId, route.toRegionId].includes(starter.world.currentRegionId));
    const result = beginRouteTravel(starter, route.id, BASE_TIME);
    assert.equal(result.ok, true);
    assert.equal(starter.world.travel.shipId, "drifting_home");
    assert.equal(starter.world.travel.speedMultiplier, 1);
    starter.world.travel = null;
    starter.world.docking = { status: "docked", regionId: starter.world.currentRegionId };
  }

  const durations = SHIPS.slice(0, 3).map(ship => {
    const state = createDeveloperState();
    switchActiveShip(state, ship.id);
    return { ship, duration: getRouteDurationForState(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID), speed: activeShipSpeed(state) };
  });
  assert.deepEqual(durations.map(entry => entry.speed), [1, 1.06, 1.12]);
  assert.ok(durations[1].duration < durations[0].duration);
  assert.ok(durations[2].duration < durations[1].duration);
  assert.ok(durations[2].duration / durations[0].duration > .89);
});

test("the rack benchmark is exactly half of the relaxed thirty-catch manual hour", () => {
  const relaxedManualCatchesPerHour = 30;
  const automaticCatchesPerHour = 60 * 60 * 1000 / AUTO_FISHING_EQUIPMENT.catchIntervalMs;
  assert.equal(automaticCatchesPerHour, 15);
  assert.equal(automaticCatchesPerHour / relaxedManualCatchesPerHour, .5);
  assert.equal(automaticCatchesPerHour * 3, AUTO_FISHING_EQUIPMENT.maxCatchCount);
});

test("five hundred normalized event inputs compact while Tideglow and fixed journal pages deduplicate", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  const habitat = rare.habitats.find(entry => entry.regionId === SLEEPING_TIDE_BAY_ID);
  recordCatch(state, economicCatch(rare, habitat, 0));
  for (let index = 2; index < 500; index += 1) {
    const result = dispatchGameEvent(state, {
      eventId: `slice-f:event:${index}`,
      type: "fish.discovered",
      source: "manual",
      refs: { fishId: rare.id }
    }, { consumerIds: ["tideglow"] });
    assert.equal(result.complete, true);
  }
  assert.equal(state.gameEvents.nextSequence, 501);
  assert.equal(state.gameEvents.pending.length, 0);
  assert.equal(state.gameEvents.recent.length, RECENT_GAME_EVENT_LIMIT);
  assert.equal(state.tideglow.total, 1);
  assert.equal(Object.keys(state.tideglow.ledgerBySourceId).length, 1);
  assert.equal(getJournalEntries(state, "rare_fish").filter(entry => entry.fishId === rare.id).length, 1);
  assert.equal(state.journal.unreadEntryIds.filter(id => id === `journal:fish:${rare.id}`).length, 1);
  assert.equal(Object.keys(state.journal.fishEncounterLineById).length, 1);
});

function autoStressState() {
  const state = createInitialState();
  state.money = 10_000;
  state.tideglow.total = 20;
  buyShip(state, "tidewhisper_residence", iso(0));
  const fish = FISH.find(entry => entry.id === "sardine");
  const caught = economicCatch(fish, fish.habitats.find(habitat => habitat.regionId === SLEEPING_TIDE_BAY_ID), 0);
  recordCatch(state, caught);
  state.baitAmounts.bread = 20_000;
  buyAutoFishingEquipment(state, iso(1000));
  return state;
}

test("two hundred forty offline settlements survive limits, stops, reloads, and the 1.5 MB hard budget", () => {
  let state = autoStressState();
  const baseline = {
    totalCaught: state.totalCaught,
    tideglow: state.tideglow.total,
    journal: structuredClone(state.journal),
    achievements: structuredClone(state.achievements),
    regional: structuredClone(state.world.regionProgress)
  };
  let settlements = 0;
  let departedStops = 0;
  const stopReasons = new Set();

  for (let cycle = 0; cycle < 240; cycle += 1) {
    if (!state.autoFishing.activeSession) {
      const armed = configureAutoFishing(state, {
        spotId: "shore",
        baitId: "bread",
        seed: `slice-f-offline:${cycle}`,
        configuredAt: iso(cycle * 30 * 60_000)
      });
      assert.equal(armed.ok, true);
    }

    if (cycle === 239) {
      assert.equal(stopAutoFishing(state, "departed").ok, true);
      departedStops += 1;
      assert.equal(configureAutoFishing(state, {
        spotId: "shore", baitId: "bread", seed: "slice-f-after-departed", configuredAt: iso(cycle * 30 * 60_000)
      }).ok, true);
    }

    const closedAt = iso(cycle * 30 * 60_000 + 60_000);
    let openedAt = iso(cycle * 30 * 60_000 + 21 * 60_000);
    if (cycle === 59) openedAt = iso(cycle * 30 * 60_000 + 181 * 60_000);
    if (cycle === 119) state.baitAmounts.bread = 1;
    if (cycle === 179) state.autoFishing.activeSession = { ...state.autoFishing.activeSession, regionId: LUMINOUS_ARCHIPELAGO_ID };
    if (cycle === 219) state.autoFishing.activeSession = { ...state.autoFishing.activeSession, spotId: "stress-invalid-spot" };
    assert.equal(markAutoFishingClosed(state, closedAt), true);
    const result = settleAutoFishing(state, openedAt);
    assert.equal(result.ok, true);
    assert.equal(result.changed, true);
    stopReasons.add(result.summary.stopReason);
    settlements += 1;
    if (cycle === 119) state.baitAmounts.bread = 20_000;
    if ((cycle + 1) % 20 === 0) state = migrateState(structuredClone(state));
  }

  assert.equal(settlements, 240);
  assert.equal(departedStops, 1);
  assert.ok(stopReasons.has("returned"));
  assert.ok(stopReasons.has("three-hour-limit"));
  assert.ok(stopReasons.has("bait-empty"));
  assert.ok(stopReasons.has("region-changed"));
  assert.ok(stopReasons.has("no-eligible-fish"));
  assert.equal(state.totalCaught, baseline.totalCaught);
  assert.equal(state.tideglow.total, baseline.tideglow);
  assert.deepEqual(state.journal, baseline.journal);
  assert.deepEqual(state.achievements, baseline.achievements);
  assert.deepEqual(state.world.regionProgress, baseline.regional);
  assert.ok(state.autoFishing.settledSessionIds.length <= 48);
  const bytes = Buffer.byteLength(JSON.stringify(state));
  assert.ok(bytes < 1_500_000, `stress save was ${bytes} bytes`);
  assert.deepEqual(migrateState(structuredClone(state)), state);
});

test("derived daily journal, ship switches, and a mature developer save stay compact and structurally stable", () => {
  const state = createDeveloperState();
  const todayBefore = getJournalEntries(state, "today");
  const aquariumBefore = state.aquarium.fish.map(caught => caught.uid);
  const inventoryBefore = state.catchInventory.map(caught => caught.uid);
  for (let index = 0; index < 300; index += 1) {
    assert.equal(switchActiveShip(state, ["drifting_home", "tidewhisper_residence", "voyager_study"][index % 3]).ok, true);
    assert.ok(shipInterior(state));
  }
  assert.deepEqual(state.aquarium.fish.map(caught => caught.uid), aquariumBefore);
  assert.deepEqual(state.catchInventory.map(caught => caught.uid), inventoryBefore);
  assert.equal(todayBefore.length, 1);
  assert.equal("dailyEntries" in state.journal, false);
  assert.equal("dailyArchives" in state.journal, false);
  const bytes = Buffer.byteLength(JSON.stringify(state));
  assert.ok(bytes < 500_000, `mature developer save was ${bytes} bytes`);
  const reloaded = migrateState(structuredClone(state));
  assert.deepEqual(getJournalEntries(reloaded, "today"), todayBefore);
  assert.equal("dailyEntries" in reloaded.journal, false);
  assert.equal("dailyArchives" in reloaded.journal, false);
});
