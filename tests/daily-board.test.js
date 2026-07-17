import test from "node:test";
import assert from "node:assert/strict";
import { DAILY_GOAL_TEMPLATES, QUEST_TEMPLATES } from "../src/data.js";
import { advanceTime, claimQuest, createDailyQuests, createInitialState, migrateState, updateQuestProgress } from "../src/core.js";
import { applyDailyQuestProgress, claimDailyQuest } from "../src/systems/daily-board.js";

const entry = (templateId, overrides = {}) => {
  const template = DAILY_GOAL_TEMPLATES.find(item => item.id === templateId);
  return { ...template, instanceId: `test-${templateId}`, progress: 0, claimed: false, ...overrides };
};

test("daily goal data keeps the v0.3 export and deterministic three-card schedule", () => {
  assert.equal(QUEST_TEMPLATES, DAILY_GOAL_TEMPLATES);
  assert.equal(new Set(DAILY_GOAL_TEMPLATES.map(template => template.id)).size, DAILY_GOAL_TEMPLATES.length);
  assert.deepEqual(createDailyQuests(1).map(quest => quest.instanceId), [
    "1-0-common3", "1-1-night1", "1-2-sell100"
  ]);
  assert.deepEqual(createDailyQuests(2).map(quest => quest.instanceId), [
    "2-0-night1", "2-1-shrimp1", "2-2-large1"
  ]);
  assert.deepEqual(createDailyQuests(6), createDailyQuests(6));
});

test("daily catch progress is pure, matches all eligible goals, and caps at each goal", () => {
  const entries = [
    entry("common3", { progress: 2 }),
    entry("night1"),
    entry("shrimp1"),
    entry("large1")
  ];
  const snapshot = structuredClone(entries);
  const next = applyDailyQuestProgress(entries, {
    type: "catch",
    fish: { rarity: "common", tags: ["night"] },
    baitId: "shrimp",
    caught: { sizeTier: "record" }
  });

  assert.deepEqual(entries, snapshot);
  assert.deepEqual(next.map(quest => quest.progress), [3, 1, 1, 1]);
  assert.notEqual(next[0], entries[0]);
  assert.deepEqual(applyDailyQuestProgress(next, { type: "catch" }), next);
});

test("daily sell progress ignores negative values and completed or claimed goals", () => {
  const sell = entry("sell100", { progress: 40 });
  assert.equal(applyDailyQuestProgress([sell], { type: "sell", amount: -25 })[0], sell);
  assert.equal(applyDailyQuestProgress([sell], { type: "sell", amount: 80 })[0].progress, 100);

  const claimed = entry("sell100", { progress: 20, claimed: true });
  const complete = entry("sell100", { progress: 100 });
  assert.deepEqual(applyDailyQuestProgress([claimed, complete], { type: "sell", amount: 100 }), [claimed, complete]);
});

test("daily rewards are claimed once without mutating the pure-function input", () => {
  const entries = [entry("common3", { progress: 3 })];
  const result = claimDailyQuest(entries, "test-common3");
  assert.equal(result.ok, true);
  assert.equal(result.reward, 85);
  assert.equal(result.entries[0].claimed, true);
  assert.equal(entries[0].claimed, false);
  assert.equal(claimDailyQuest(result.entries, "test-common3").ok, false);
  assert.equal(claimDailyQuest(entries, "missing").ok, false);
  assert.equal(claimDailyQuest([entry("common3", { progress: 2 })], "test-common3").ok, false);
});

test("legacy core quest wrappers preserve in-place state and one-time coin rewards", () => {
  const state = createInitialState();
  state.currentQuests = [entry("common3", { progress: 2 })];
  const arrayReference = state.currentQuests;
  updateQuestProgress(state, {
    type: "catch",
    fish: { rarity: "common", tags: [] },
    baitId: "bread",
    caught: { sizeTier: "standard" }
  });
  assert.equal(state.currentQuests, arrayReference);
  assert.equal(state.currentQuests[0].progress, 3);

  const moneyBefore = state.money;
  assert.equal(claimQuest(state, "test-common3"), true);
  assert.equal(state.money, moneyBefore + 85);
  assert.equal(claimQuest(state, "test-common3"), false);
  assert.equal(state.money, moneyBefore + 85);
});

test("v3 migration preserves daily progress and a new sailing day replaces the board", () => {
  const savedQuests = [
    entry("common3", { instanceId: "1-0-common3", progress: 2 }),
    entry("night1", { instanceId: "1-1-night1", progress: 1, claimed: true }),
    entry("sell100", { instanceId: "1-2-sell100", progress: 44 })
  ];
  const migrated = migrateState({ version: 3, day: 1, currentQuests: savedQuests });
  assert.deepEqual(migrated.currentQuests, savedQuests);

  for (let index = 0; index < 4; index += 1) advanceTime(migrated, () => 1);
  assert.equal(migrated.day, 2);
  assert.deepEqual(migrated.currentQuests, createDailyQuests(2));
});
