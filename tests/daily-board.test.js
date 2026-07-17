import test from "node:test";
import assert from "node:assert/strict";
import { DAILY_GOAL_TEMPLATES, QUEST_TEMPLATES } from "../src/data.js";
import {
  advanceTime, claimQuest, createInitialState, migrateState, updateQuestProgress, updateProgressEvent
} from "../src/core.js";
import {
  applyDailyGoalProgress, claimDailyGoal, createDailyBoard, createDailyGoalEntry,
  createDailyQuests, getAvailableDailyGoalTemplates
} from "../src/systems/daily-board.js";

const entry = (templateId, overrides = {}) => {
  const template = DAILY_GOAL_TEMPLATES.find(item => item.id === templateId);
  return createDailyGoalEntry(template, 1, 0, { instanceId: `test-${templateId}`, ...overrides });
};

const catchEvent = (overrides = {}) => ({
  type: "catch",
  source: "manual",
  fish: { id: "test-fish", rarity: "common", tags: ["night"] },
  caught: { sizeTier: "record" },
  baitId: "shrimp",
  regionId: "sleeping_tide_bay",
  spotId: "shore",
  timeId: "night",
  weather: "sunny",
  ...overrides
});

test("daily goal data uses structured conditions and deterministic three-card schedules", () => {
  assert.equal(QUEST_TEMPLATES, DAILY_GOAL_TEMPLATES);
  assert.equal(new Set(DAILY_GOAL_TEMPLATES.map(template => template.id)).size, DAILY_GOAL_TEMPLATES.length);
  assert.ok(DAILY_GOAL_TEMPLATES.every(template => template.condition?.eventType && template.reward?.type));
  assert.deepEqual(createDailyQuests(1).map(quest => quest.instanceId), [
    "1-0-common3", "1-1-night1", "1-2-sell100"
  ]);
  assert.deepEqual(createDailyQuests(2).map(quest => quest.instanceId), [
    "2-0-night1", "2-1-shrimp1", "2-2-large1"
  ]);
  assert.deepEqual(createDailyBoard(6), createDailyBoard(6));
});

test("daily generation excludes conditions that are not unlocked and remains completable", () => {
  const context = {
    availableRegionIds: ["sleeping_tide_bay"],
    availableSpotIds: ["shore", "reef"],
    availableBaitIds: ["bread"],
    availableFishIds: ["sardine"],
    fishCatalog: [{ id: "sardine", rarity: "common", tags: ["small"] }]
  };
  const available = getAvailableDailyGoalTemplates(context);
  assert.equal(available.some(template => template.id === "shrimp1"), false);
  assert.equal(createDailyBoard(1, context).entries.length, 3);
  assert.equal(createDailyBoard(1, context).entries.some(item => item.templateId === "shrimp1"), false);
});

test("manual catch progress is pure, matches all eligible goals, and automatic sources are ignored", () => {
  const board = {
    day: 1,
    entries: [entry("common3", { progress: 2 }), entry("night1"), entry("shrimp1"), entry("large1")]
  };
  const snapshot = structuredClone(board);
  const next = applyDailyGoalProgress(board, catchEvent());

  assert.deepEqual(board, snapshot);
  assert.deepEqual(next.entries.map(goal => goal.progress), [3, 1, 1, 1]);
  assert.notEqual(next.entries[0], board.entries[0]);
  assert.deepEqual(applyDailyGoalProgress(next, catchEvent({ source: "automatic" })), next);
});

test("daily sell progress ignores negative values and completed or claimed goals", () => {
  const sell = entry("sell100", { progress: 40 });
  const board = { day: 1, entries: [sell] };
  assert.equal(applyDailyGoalProgress(board, { type: "sell", source: "manual", amount: -25 }).entries[0], sell);
  assert.equal(applyDailyGoalProgress(board, { type: "sell", source: "manual", amount: 80 }).entries[0].progress, 100);

  const claimed = entry("sell100", { progress: 20, claimed: true });
  const complete = entry("sell100", { progress: 100 });
  const protectedBoard = { day: 1, entries: [claimed, complete] };
  assert.deepEqual(applyDailyGoalProgress(protectedBoard, { type: "sell", source: "manual", amount: 100 }), protectedBoard);
});

test("structured daily rewards are claimed once without mutating pure-function input", () => {
  const board = { day: 1, entries: [entry("common3", { progress: 3 })] };
  const result = claimDailyGoal(board, "test-common3");
  assert.equal(result.ok, true);
  assert.deepEqual(result.reward, { type: "coins", amount: 85, label: "85 金幣" });
  assert.equal(result.board.entries[0].claimed, true);
  assert.equal(board.entries[0].claimed, false);
  assert.equal(claimDailyGoal(result.board, "test-common3").ok, false);
  assert.equal(claimDailyGoal(board, "missing").ok, false);
  assert.equal(claimDailyGoal({ day: 1, entries: [entry("common3", { progress: 2 })] }, "test-common3").ok, false);
});

test("legacy core quest wrappers update dailyBoard and grant one-time rewards", () => {
  const state = createInitialState();
  state.dailyBoard = { day: 1, entries: [entry("common3", { progress: 2 })] };
  updateQuestProgress(state, catchEvent({ fish: { id: "sardine", rarity: "common", tags: [] }, baitId: "bread", timeId: "dawn", caught: { sizeTier: "standard" } }));
  assert.equal(state.dailyBoard.entries[0].progress, 3);

  const moneyBefore = state.money;
  assert.equal(claimQuest(state, "test-common3"), true);
  assert.equal(state.money, moneyBefore + 85);
  assert.equal(claimQuest(state, "test-common3"), false);
  assert.equal(state.money, moneyBefore + 85);
});

test("v3 currentQuests migrate into dailyBoard and completed rewards auto-claim before rollover", () => {
  const legacyQuests = [
    { id: "common3", instanceId: "1-0-common3", type: "rarity", target: "common", goal: 3, reward: 85, progress: 3, claimed: false },
    { id: "night1", instanceId: "1-1-night1", type: "tag", target: "night", goal: 1, reward: 110, progress: 1, claimed: true },
    { id: "sell100", instanceId: "1-2-sell100", type: "sell", target: "coins", goal: 100, reward: 75, progress: 44, claimed: false }
  ];
  const migrated = migrateState({ version: 3, day: 1, timeIndex: 3, money: 200, currentQuests: legacyQuests });
  assert.equal(migrated.currentQuests, undefined);
  assert.deepEqual(migrated.dailyBoard.entries.map(entry => ({ id: entry.templateId, progress: entry.progress, claimed: entry.claimed })), [
    { id: "common3", progress: 3, claimed: false },
    { id: "night1", progress: 1, claimed: true },
    { id: "sell100", progress: 44, claimed: false }
  ]);

  const result = advanceTime(migrated, () => 1);
  assert.equal(result.dayChanged, true);
  assert.equal(result.autoClaims.length, 1);
  assert.equal(migrated.money, 285);
  assert.equal(migrated.dailyBoard.day, 2);
  assert.deepEqual(migrated.dailyBoard.entries, createDailyBoard(2).entries);
});

test("automatic progress events cannot advance the daily board", () => {
  const state = createInitialState();
  const before = state.dailyBoard.entries.map(entry => entry.progress);
  updateProgressEvent(state, catchEvent({ source: "automatic" }));
  assert.deepEqual(state.dailyBoard.entries.map(entry => entry.progress), before);
});
