import test from "node:test";
import assert from "node:assert/strict";
import {
  SHIPS, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  activeShip, activeShipSpeed, beginRouteTravel, buyShip, createDeveloperState, createInitialState,
  developerRevealShips, developerSetShipOwned, developerSetShipSpeed, getRouteDurationForState,
  migrateState, switchActiveShip
} from "../src/core.js";
import { revealEligibleShips } from "../src/systems/ships.js";
import { grantChapterOneRoute } from "./story-route-helper.js";

const ROUTE_ID = SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID;
const unlockTideglow = (state, total) => {
  state.tideglow.enabled = true;
  state.tideglow.total = total;
  return state;
};

test("six ships keep the confirmed thresholds, prices, speeds, and preview boundary", () => {
  assert.deepEqual(SHIPS.map(ship => ({
    name: ship.name,
    status: ship.status,
    tideglow: ship.tideglowRequired,
    price: ship.price,
    speed: ship.speedMultiplier
  })), [
    { name: "漂流小屋", status: "implemented", tideglow: 0, price: 0, speed: 1 },
    { name: "潮聲居所", status: "implemented", tideglow: 20, price: 1800, speed: 1.06 },
    { name: "遠航書房", status: "implemented", tideglow: 50, price: 4200, speed: 1.12 },
    { name: "微光水室", status: "preview", tideglow: 90, price: null, speed: 1.18 },
    { name: "世界船屋", status: "preview", tideglow: 140, price: null, speed: 1.24 },
    { name: "星潮博物艙", status: "preview", tideglow: 200, price: null, speed: 1.3 }
  ]);
});

test("ship purchase requires Tideglow, coins, and a valid dock without spending Tideglow", () => {
  const state = createInitialState();
  state.money = 10000;
  state.tideglow.total = 999;
  assert.equal(buyShip(state, "tidewhisper_residence").reason, "chapter-locked");
  unlockTideglow(state, 19);
  assert.equal(buyShip(state, "tidewhisper_residence").reason, "tideglow");
  state.tideglow.total = 20;
  state.world.docking = { status: "traveling", regionId: null };
  assert.equal(buyShip(state, "tidewhisper_residence").reason, "not-docked");
  state.world.docking = { status: "docked", regionId: state.world.currentRegionId };

  const bought = buyShip(state, "tidewhisper_residence", "2026-07-18T03:00:00.000Z");
  assert.equal(bought.ok, true);
  assert.equal(state.money, 8200);
  assert.equal(state.tideglow.total, 20);
  assert.equal(state.ships.activeShipId, "tidewhisper_residence");
  assert.equal(state.ships.purchasedAtByShipId.tidewhisper_residence, "2026-07-18T03:00:00.000Z");
  assert.equal(buyShip(state, "tidewhisper_residence").reason, "owned");
  assert.equal(buyShip(state, "glimmer_water_room").reason, "preview");
});

test("switching is idempotent, only uses owned ships, and is blocked away from port", () => {
  const state = createInitialState();
  state.money = 10000;
  unlockTideglow(state, 50);
  buyShip(state, "tidewhisper_residence");
  assert.equal(switchActiveShip(state, "voyager_study").reason, "not-owned");
  assert.equal(switchActiveShip(state, "drifting_home").ok, true);
  assert.equal(switchActiveShip(state, "drifting_home").unchanged, true);
  state.world.docking = { status: "offshore", regionId: state.world.currentRegionId };
  assert.equal(switchActiveShip(state, "tidewhisper_residence").reason, "not-docked");
});

test("Tideglow thresholds reveal once without granting ownership", () => {
  const state = createInitialState();
  unlockTideglow(state, 50);
  const first = revealEligibleShips(state);
  assert.deepEqual(first.map(ship => ship.id), ["tidewhisper_residence", "voyager_study"]);
  assert.deepEqual(state.ships.ownedShipIds, ["drifting_home"]);
  assert.deepEqual(revealEligibleShips(state), []);
});

test("route duration uses the active ship and locks ship and speed into the voyage", () => {
  const state = createInitialState();
  grantChapterOneRoute(state);
  state.money = 10000;
  unlockTideglow(state, 20);
  buyShip(state, "tidewhisper_residence");
  const expected = Math.round(6 * 60 * 1000 / 1.06);
  assert.equal(getRouteDurationForState(state, ROUTE_ID), expected);
  const departure = beginRouteTravel(state, ROUTE_ID, Date.parse("2026-07-18T00:00:00.000Z"));
  assert.equal(departure.durationMs, expected);
  assert.equal(state.world.travel.shipId, "tidewhisper_residence");
  assert.equal(state.world.travel.speedMultiplier, 1.06);

  state.ships.activeShipId = "drifting_home";
  assert.equal(state.world.travel.durationMs, expected);
  const reloaded = migrateState(structuredClone(state));
  assert.equal(reloaded.world.travel.durationMs, expected);
  assert.equal(reloaded.world.travel.shipId, "tidewhisper_residence");
  assert.equal(reloaded.world.travel.speedMultiplier, 1.06);
});

test("developer ship controls use the same catalog and never affect normal defaults", () => {
  const developer = createDeveloperState();
  assert.equal(activeShip(developer).id, "voyager_study");
  assert.deepEqual(developer.ships.ownedShipIds, ["drifting_home", "tidewhisper_residence", "voyager_study"]);
  assert.equal(developerSetShipOwned(developer, "tidewhisper_residence", false), true);
  assert.equal(developer.ships.ownedShipIds.includes("tidewhisper_residence"), false);
  assert.equal(developerRevealShips(developer), true);
  assert.equal(developer.ships.revealedShipIds.length, SHIPS.length);
  assert.equal(developerSetShipSpeed(developer, 1.5), true);
  assert.equal(activeShipSpeed(developer), 1.5);
  assert.deepEqual(createInitialState().ships.ownedShipIds, ["drifting_home"]);
});
