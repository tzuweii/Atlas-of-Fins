import test from "node:test";
import assert from "node:assert/strict";
import { FISH } from "../src/data.js";
import {
  advanceTime, applyMilestones, buyBait, buyRod, chooseFish, createInitialState,
  fishWeight, generateCatch, migrateState, recordCatch, sellCatches
} from "../src/core.js";

test("MVP contains exactly twenty distinct fish", () => {
  assert.equal(FISH.length, 20);
  assert.equal(new Set(FISH.map(fish => fish.id)).size, 20);
});

test("fish pool respects fishing spot", () => {
  const state = createInitialState();
  state.selectedSpot = "shore";
  for (const fish of FISH) {
    assert.equal(fishWeight(fish, state) > 0, fish.spots.includes("shore"));
  }
  assert.ok(chooseFish(state, () => .5).spots.includes("shore"));
});

test("catch price uses size and rarity and records discoveries", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  const caught = generateCatch(rare, () => .99);
  assert.equal(caught.sizeTier, "record");
  assert.equal(caught.price, Math.round(rare.basePrice * 4 * 1.7));
  const outcome = recordCatch(state, caught);
  assert.equal(outcome.isNew, true);
  assert.equal(state.discovered[rare.id].count, 1);
  assert.equal(state.catchInventory.length, 1);
});

test("selling cannot make money negative", () => {
  const state = createInitialState();
  const caught = generateCatch(FISH[0], () => .5);
  recordCatch(state, caught);
  const before = state.money;
  const sold = sellCatches(state, [caught.uid]);
  assert.equal(state.money, before + sold.total);
  assert.ok(state.money >= 0);
});

test("purchases enforce unlocks and balances", () => {
  const state = createInitialState();
  state.money = 10000;
  assert.equal(buyRod(state, "light"), false);
  for (let i = 0; i < 4; i++) state.discovered[FISH[i].id] = { count: 1, bestLength: 1, bestWeight: 1 };
  assert.equal(buyRod(state, "light"), true);
  const prior = state.baitAmounts.shrimp;
  assert.equal(buyBait(state, "shrimp"), true);
  assert.ok(state.baitAmounts.shrimp > prior);
});

test("milestones reward once and time advances safely", () => {
  const state = createInitialState();
  for (let i = 0; i < 5; i++) state.discovered[FISH[i].id] = { count: 1, bestLength: 1, bestWeight: 1 };
  const first = applyMilestones(state);
  const money = state.money;
  assert.equal(first.length, 1);
  assert.equal(applyMilestones(state).length, 0);
  assert.equal(state.money, money);
  for (let i = 0; i < 4; i++) advanceTime(state, () => 0);
  assert.equal(state.day, 2);
  assert.equal(state.weather, "rain");
});

test("partial and malformed saves migrate without losing defaults", () => {
  const state = migrateState({ money: -5, baitAmounts: { bread: 99 }, placedFurniture: null });
  assert.equal(state.money, 0);
  assert.equal(state.baitAmounts.bread, 99);
  assert.ok("shrimp" in state.baitAmounts);
  assert.equal(state.placedFurniture.sleep, "sleeping_bag");
});
