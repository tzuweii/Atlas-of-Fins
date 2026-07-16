import test from "node:test";
import assert from "node:assert/strict";
import { ACHIEVEMENTS, FISH } from "../src/data.js";
import {
  SAVE_VERSION, SHIMMER_CONFIG, advanceTime, applyMilestones, buyBait, buyRod, chooseFish, claimAchievement,
  createInitialState, equipTitle, evaluateAchievements, fishWeight, generateCatch, getAchievementProgress,
  getAquariumCapacity, getFamiliarity, getUnclaimedAchievementCount, migrateState, moveCatchToAquarium,
  recordCatch, removeFishFromAquarium, replaceAquariumFish, rollVariant, sellCatches,
  setAquariumDecoration, swapAquariumFish
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
  const context = { spotId: "deep", timeId: "night", weather: "rain", baitId: "glow", rodId: "farcast", day: 4 };
  const caught = generateCatch(rare, context, () => .99);
  assert.equal(caught.sizeTier, "record");
  assert.equal(caught.price, Math.round(rare.basePrice * 4 * 1.7));
  assert.deepEqual(caught.context, context);
  const outcome = recordCatch(state, caught);
  assert.equal(outcome.isNew, true);
  assert.equal(outcome.familiarity.name, "初次相遇");
  assert.equal(state.discovered[rare.id].count, 1);
  assert.deepEqual(state.discovered[rare.id].spots, ["deep"]);
  assert.deepEqual(state.discovered[rare.id].times, ["night"]);
  assert.deepEqual(state.discovered[rare.id].weathers, ["rain"]);
  assert.equal(state.catchInventory.length, 1);
});

test("familiarity progresses at one, three, five, and ten catches", () => {
  assert.equal(getFamiliarity(0).name, "未發現");
  assert.deepEqual([1, 3, 5, 10].map(count => getFamiliarity(count).name), ["初次相遇", "生態筆記", "熟悉", "精通"]);
  assert.equal(getFamiliarity(4).nextCount, 5);
  assert.equal(getFamiliarity(10).nextCount, null);
});

test("shimmer chance combines base, record, and mastery bonuses", () => {
  const state = createInitialState();
  const fishId = FISH[0].id;
  assert.equal(rollVariant(fishId, "standard", state, () => .019).variant, "shimmer");
  assert.equal(rollVariant(fishId, "standard", state, () => .02).variant, "normal");
  assert.equal(rollVariant(fishId, "record", state, () => .039).variant, "shimmer");
  state.discovered[fishId] = { count: 10, shimmerPity: 0 };
  const masteredRecord = rollVariant(fishId, "record", state, () => .049);
  assert.equal(masteredRecord.variant, "shimmer");
  assert.equal(masteredRecord.chance, SHIMMER_CONFIG.maxChance);
});

test("shimmer pity is tracked per fish and lowered by mastery", () => {
  const state = createInitialState();
  const [first, second] = FISH;
  state.discovered[first.id] = { count: 5, shimmerPity: 29 };
  state.discovered[second.id] = { count: 5, shimmerPity: 28 };
  assert.deepEqual(rollVariant(first.id, "standard", state, () => .99), {
    variant: "shimmer", chance: .02, guaranteed: true, pityLimit: 30
  });
  assert.equal(rollVariant(second.id, "standard", state, () => .99).variant, "normal");
  state.discovered[first.id] = { count: 10, shimmerPity: 19 };
  const mastered = rollVariant(first.id, "standard", state, () => .99);
  assert.equal(mastered.variant, "shimmer");
  assert.equal(mastered.pityLimit, 20);
});

test("shimmer catches double final price and reward first research once", () => {
  const state = createInitialState();
  const fish = FISH[0];
  const context = { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 };
  const caught = generateCatch(fish, context, state, () => 0);
  const normalSmallPrice = Math.round(fish.basePrice * .8);
  assert.equal(caught.variant, "shimmer");
  assert.equal(caught.price, normalSmallPrice * SHIMMER_CONFIG.priceMultiplier);
  const initialMoney = state.money;
  const first = recordCatch(state, caught);
  assert.equal(first.isFirstShimmer, true);
  assert.equal(state.discovered[fish.id].shimmerCount, 1);
  assert.equal(state.discovered[fish.id].shimmerPity, 0);
  assert.equal(state.money, initialMoney + 35 + SHIMMER_CONFIG.researchReward);

  const normalCaught = generateCatch(fish, context, () => .5);
  const beforeNormal = state.money;
  const normal = recordCatch(state, normalCaught);
  assert.equal(normalCaught.variant, "normal");
  assert.equal(normal.isFirstShimmer, false);
  assert.equal(state.discovered[fish.id].shimmerPity, 1);
  assert.equal(state.money, beforeNormal);

  const secondCaught = generateCatch(fish, context, state, () => 0);
  const beforeSecond = state.money;
  const second = recordCatch(state, secondCaught);
  assert.equal(second.isFirstShimmer, false);
  assert.equal(state.discovered[fish.id].shimmerCount, 2);
  assert.equal(state.discovered[fish.id].shimmerPity, 0);
  assert.equal(state.money, beforeSecond);
});

test("repeat catches aggregate encounter history without duplicates", () => {
  const state = createInitialState();
  const fish = FISH[0];
  const first = generateCatch(fish, { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 }, () => .5);
  const second = generateCatch(fish, { spotId: "shore", timeId: "day", weather: "rain", baitId: "bread", rodId: "wood", day: 2 }, () => .6);
  recordCatch(state, first);
  recordCatch(state, second);
  assert.deepEqual(state.discovered[fish.id].spots, ["shore"]);
  assert.deepEqual(state.discovered[fish.id].times, ["dawn", "day"]);
  assert.deepEqual(state.discovered[fish.id].weathers, ["sunny", "rain"]);
  assert.equal(state.discovered[fish.id].lastCaught, second.caughtAt);
});

test("aquarium capacity follows discovery milestones", () => {
  const state = createInitialState();
  const expected = new Map([[0, 0], [5, 3], [10, 5], [15, 8], [20, 10]]);
  for (let count = 0; count <= FISH.length; count++) {
    if (count) state.discovered[FISH[count - 1].id] = { count: 1 };
    if (expected.has(count)) assert.equal(getAquariumCapacity(state), expected.get(count));
  }
});

test("aquarium transfers preserve specimens and reject locked or full tanks", () => {
  const state = createInitialState();
  const catches = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, { spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 }, () => .4 + index * .01));
  state.catchInventory = [...catches];
  assert.deepEqual(moveCatchToAquarium(state, catches[0].uid), { ok: false, reason: "locked" });
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1 };
  for (const caught of catches.slice(0, 3)) assert.equal(moveCatchToAquarium(state, caught.uid).ok, true);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.catchInventory.length, 1);
  assert.deepEqual(moveCatchToAquarium(state, catches[3].uid), { ok: false, reason: "full" });
  const removed = removeFishFromAquarium(state, catches[1].uid);
  assert.equal(removed.ok, true);
  assert.equal(removed.caught, catches[1]);
  assert.equal(state.catchInventory.at(-1), catches[1]);
});

test("aquarium replacement and reordering never duplicate or lose specimens", () => {
  const state = createInitialState();
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1 };
  const catches = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, () => .35 + index * .01));
  state.catchInventory = [...catches];
  for (const caught of catches.slice(0, 3)) moveCatchToAquarium(state, caught.uid);
  const replaced = replaceAquariumFish(state, catches[3].uid, catches[1].uid);
  assert.equal(replaced.ok, true);
  assert.deepEqual(state.aquarium.fish.map(item => item.uid), [catches[0].uid, catches[3].uid, catches[2].uid]);
  assert.deepEqual(state.catchInventory.map(item => item.uid), [catches[1].uid]);
  assert.equal(swapAquariumFish(state, 0, 2).ok, true);
  assert.deepEqual(state.aquarium.fish.map(item => item.uid), [catches[2].uid, catches[3].uid, catches[0].uid]);
  assert.deepEqual(swapAquariumFish(state, 0, 4), { ok: false, reason: "invalid-index" });
  const allUids = [...state.catchInventory, ...state.aquarium.fish].map(item => item.uid);
  assert.equal(allUids.length, catches.length);
  assert.equal(new Set(allUids).size, catches.length);
});

test("save migration returns aquarium overflow to inventory and removes duplicate UIDs", () => {
  const discovered = Object.fromEntries(FISH.slice(0, 5).map(fish => [fish.id, { count: 1 }]));
  const specimens = FISH.slice(0, 4).map((fish, index) => generateCatch(fish, () => .3 + index * .01));
  const state = migrateState({
    discovered,
    catchInventory: [specimens[0]],
    aquarium: { fish: specimens }
  });
  assert.equal(getAquariumCapacity(state), 3);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.catchInventory.length, 1);
  assert.equal(state.catchInventory[0].uid, specimens[3].uid);
  const uids = [...state.aquarium.fish, ...state.catchInventory].map(item => item.uid);
  assert.equal(new Set(uids).size, 4);
});

test("achievement catalog has twelve unique data-driven goals", () => {
  assert.equal(ACHIEVEMENTS.length, 12);
  assert.equal(new Set(ACHIEVEMENTS.map(item => item.id)).size, ACHIEVEMENTS.length);
  assert.ok(ACHIEVEMENTS.every(item => item.goal > 0 && item.reward?.label));
});

test("achievement evaluation backfills progress once without auto-claiming", () => {
  const state = createInitialState();
  state.totalCaught = 5;
  for (let index = 0; index < 5; index++) {
    state.discovered[FISH[index].id] = {
      count: 1,
      caughtShimmer: index === 0,
      times: index < 4 ? [["dawn", "day", "dusk", "night"][index]] : []
    };
  }
  const completed = evaluateAchievements(state, "2026-07-16T00:00:00.000Z");
  assert.deepEqual(completed.map(item => item.id), ["first_catch", "species_5", "shimmer_1", "conditions_4"]);
  assert.equal(getUnclaimedAchievementCount(state), 4);
  assert.equal(state.achievements.species_5.claimed, false);
  assert.equal(evaluateAchievements(state).length, 0);
  assert.deepEqual(getAchievementProgress(state, "conditions_4"), { current: 4, goal: 4, complete: true });
});

test("achievement rewards can only be claimed once and unlock selectable cosmetics", () => {
  const state = createInitialState();
  state.totalCaught = 1;
  for (let index = 0; index < 5; index++) state.discovered[FISH[index].id] = { count: 1, caughtShimmer: index === 0, times: [] };
  evaluateAchievements(state);
  const money = state.money;
  assert.equal(claimAchievement(state, "first_catch").ok, true);
  assert.equal(state.money, money + 40);
  assert.equal(claimAchievement(state, "first_catch").ok, false);
  assert.equal(state.money, money + 40);

  assert.equal(claimAchievement(state, "species_5").ok, true);
  assert.ok(state.unlockedTitles.includes("海灣訪客"));
  assert.equal(equipTitle(state, "海灣訪客"), true);
  assert.equal(equipTitle(state, "不存在的稱號"), false);
  assert.equal(state.equippedTitle, "海灣訪客");

  assert.equal(claimAchievement(state, "shimmer_1").ok, true);
  assert.ok(state.unlockedAquariumDecor.includes("shimmer_specks"));
  assert.equal(state.aquariumDecoration, "shimmer_specks");
  assert.equal(setAquariumDecoration(state, null), true);
  assert.equal(setAquariumDecoration(state, "shimmer_specks"), true);
});

test("record catches and a full starter aquarium complete their goals", () => {
  const state = createInitialState();
  for (const fish of FISH.slice(0, 5)) state.discovered[fish.id] = { count: 1, times: [] };
  const catches = FISH.slice(0, 3).map(fish => generateCatch(fish, () => .99));
  for (const caught of catches) recordCatch(state, caught);
  assert.equal(state.recordCatches, 3);
  assert.equal(state.achievements.record_3.claimed, false);
  for (const caught of catches) moveCatchToAquarium(state, caught.uid);
  assert.equal(state.aquarium.fish.length, 3);
  assert.equal(state.achievements.aquarium_3.claimed, false);
});

test("migration restores claimed non-coin rewards and backfills current goals", () => {
  const discovered = Object.fromEntries(FISH.slice(0, 5).map((fish, index) => [fish.id, { count: 1, caughtShimmer: index === 0 }]));
  const state = migrateState({
    discovered,
    totalCaught: 5,
    achievements: {
      species_5: { completedAt: "2026-07-16T00:00:00.000Z", claimed: true },
      shimmer_1: { completedAt: "2026-07-16T00:00:00.000Z", claimed: true }
    },
    equippedTitle: "海灣訪客",
    aquariumDecoration: "shimmer_specks"
  });
  assert.ok(state.unlockedTitles.includes("海灣訪客"));
  assert.equal(state.equippedTitle, "海灣訪客");
  assert.ok(state.unlockedAquariumDecor.includes("shimmer_specks"));
  assert.equal(state.aquariumDecoration, "shimmer_specks");
  assert.ok(state.achievements.first_catch);
  assert.equal(state.achievements.first_catch.claimed, false);
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
  const legacyCatch = {
    uid: "sardine-old",
    fishId: "sardine",
    length: 18,
    weight: .14,
    sizeTier: "standard",
    price: 28,
    caughtAt: "2026-01-02T03:04:05.000Z"
  };
  const state = migrateState({
    version: 1,
    money: -5,
    baitAmounts: { bread: 99 },
    placedFurniture: null,
    discovered: {
      sardine: { count: 3, bestLength: 18, bestWeight: .14, firstCaught: legacyCatch.caughtAt, shimmerCount: 2 },
      anchovy: { count: "invalid" }
    },
    catchInventory: [legacyCatch, { fishId: "missing-fish" }]
  });
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.money, 0);
  assert.equal(state.baitAmounts.bread, 99);
  assert.ok("shrimp" in state.baitAmounts);
  assert.equal(state.placedFurniture.sleep, "sleeping_bag");
  assert.deepEqual(state.discovered.sardine.spots, []);
  assert.equal(state.discovered.sardine.lastCaught, legacyCatch.caughtAt);
  assert.equal(state.discovered.sardine.caughtShimmer, true);
  assert.equal(state.discovered.anchovy, undefined);
  assert.equal(state.catchInventory.length, 1);
  assert.equal(state.catchInventory[0].variant, "normal");
  assert.deepEqual(state.catchInventory[0].context, { spotId: null, timeId: null, weather: null, baitId: null, rodId: null, day: null });
  assert.deepEqual(state.aquarium, { fish: [] });
});
