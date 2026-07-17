import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FISH } from "../src/data.js";
import { SAVE_VERSION, migrateState } from "../src/core.js";

const readFixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const dailySnapshot = entries => entries.map(entry => ({
  templateId: entry.templateId || entry.id,
  instanceId: entry.instanceId,
  progress: entry.progress,
  claimed: entry.claimed
}));

test("normal v3 fixture preserves daily progress and collection state", () => {
  const raw = readFixture("v3-normal-save.json");
  const state = migrateState(raw);
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.money, 314);
  assert.equal(state.day, 4);
  assert.equal(state.discovered.sardine.count, 2);
  assert.deepEqual(dailySnapshot(state.dailyBoard.entries), dailySnapshot(raw.currentQuests));
});

test("progressed v3 fixture preserves claimed goals, events, and twenty discoveries", () => {
  const raw = readFixture("v3-progressed-save.json");
  const state = migrateState(raw);
  assert.equal(Object.keys(state.discovered).length, 20);
  assert.equal(state.dailyBoard.entries[0].claimed, true);
  assert.equal(state.dailyBoard.entries[1].progress, 2);
  assert.equal(state.bayEvent.eventId, "moonlit_tide");
  assert.equal(state.bayEvent.progress, 1);
  assert.equal(state.bayEventHistory.silver_tide.completions, 1);
});

test("legacy v3 developer fixture backfills the current catalog without changing daily progress", () => {
  const raw = readFixture("v3-developer-save.json");
  const state = migrateState(raw);
  assert.equal(state.developerMode, true);
  assert.equal(Object.keys(state.discovered).length, FISH.length);
  assert.equal(state.totalCaught, FISH.length * 10);
  assert.ok(state.completedMilestones.includes(30));
  assert.deepEqual(dailySnapshot(state.dailyBoard.entries), dailySnapshot(raw.currentQuests));
});
