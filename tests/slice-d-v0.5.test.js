import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_TIDE_ESSAYS, FISH, HIGH_TIER_RARITIES, JOURNAL_CATEGORIES, JOURNAL_EVENT_TEMPLATES,
  MAIN_STORY_JOURNAL_ENTRIES, RARE_FISH_JOURNAL_ENTRIES
} from "../src/data.js";
import {
  advanceTime, createInitialState, dispatchGameEvent, getJournalCategories, getJournalEntries,
  getJournalEntry, getJournalUnreadCount, markJournalEntriesRead, migrateState, recordCatch,
  syncJournalUnlocks
} from "../src/core.js";
import { JOURNAL_VERSION, applyJournalEvent, createJournalState, normalizeJournalState } from "../src/systems/journal.js";

const caught = (fishId, overrides = {}) => ({
  uid: overrides.uid || `journal-${fishId}-${overrides.variant || "normal"}`,
  fishId,
  length: overrides.length || 24,
  weight: overrides.weight || .4,
  sizeTier: overrides.sizeTier || "standard",
  variant: overrides.variant || "normal",
  price: overrides.price || 50,
  caughtAt: overrides.caughtAt || "2026-07-18T01:00:00.000Z",
  context: {
    regionId: overrides.regionId || "sleeping_tide_bay",
    spotId: overrides.spotId || "shore",
    timeId: overrides.timeId || "dawn",
    weather: overrides.weather || "sunny",
    baitId: "bread",
    rodId: "wood",
    day: overrides.day || 1
  }
});

test("journal catalogs separate special sea conditions from six main-story chapters", () => {
  assert.equal(JOURNAL_CATEGORIES.length, 9);
  assert.deepEqual(JOURNAL_CATEGORIES.slice(0, 3).map(category => category.id), ["today", "rare_fish", "sea_events"]);
  assert.equal(JOURNAL_CATEGORIES.filter(category => category.kind === "story").length, 6);
  assert.equal(JOURNAL_CATEGORIES.filter(category => category.kind === "events").length, 1);
  assert.equal(RARE_FISH_JOURNAL_ENTRIES.length, FISH.filter(fish => HIGH_TIER_RARITIES.includes(fish.rarity)).length);
  assert.equal(MAIN_STORY_JOURNAL_ENTRIES.filter(entry => entry.categoryId === "sleeping_tide_bay").length, 6);
  assert.equal(MAIN_STORY_JOURNAL_ENTRIES.filter(entry => entry.categoryId === "sea_events").length, 3);
  assert.equal(MAIN_STORY_JOURNAL_ENTRIES.filter(entry => entry.categoryId === "luminous_archipelago").length, 6);
  assert.equal(MAIN_STORY_JOURNAL_ENTRIES.filter(entry => entry.categoryId === "mist_cape_cold_current").length, 6);
  assert.equal(DAILY_TIDE_ESSAYS.length, 12);
  assert.equal(JOURNAL_EVENT_TEMPLATES.length, 3);
});

test("today tide note always exists, ignores gameplay events, and changes only with the sailing day", () => {
  const state = createInitialState();
  const dayOne = getJournalEntries(state, "today")[0];
  assert.equal(dayOne.type, "today");
  assert.equal(dayOne.sailingDay, 1);
  assert.ok(dayOne.body.length >= 2);
  const journalBefore = structuredClone(state.journal);
  const common = FISH.find(fish => fish.rarity === "common");
  recordCatch(state, caught(common.id, { variant: "shimmer", weather: "rain" }));
  assert.equal(getJournalEntries(state, "today")[0].id, dayOne.id);
  assert.equal(Object.hasOwn(state.journal, "dailyEntries"), false);
  for (let index = 0; index < 4; index += 1) advanceTime(state, () => 1);
  const dayTwo = getJournalEntries(state, "today")[0];
  assert.equal(dayTwo.sailingDay, 2);
  assert.notEqual(dayTwo.id, dayOne.id);
  assert.deepEqual(Object.keys(state.journal).sort(), Object.keys(journalBefore).sort());
});

test("common and uncommon fish keep a short field note without entering the journal", () => {
  const state = createInitialState();
  const common = FISH.find(fish => fish.rarity === "common");
  const uncommon = FISH.find(fish => fish.rarity === "uncommon");
  recordCatch(state, caught(common.id));
  recordCatch(state, caught(uncommon.id, { uid: "journal-uncommon" }));
  assert.match(state.journal.fishEncounterLineById[common.id], new RegExp(common.name));
  assert.match(state.journal.fishEncounterLineById[uncommon.id], new RegExp(uncommon.name));
  assert.equal(getJournalEntries(state, "rare_fish").length, 0);
});

test("the first manual rare catch unlocks exactly one fixed encounter page", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  recordCatch(state, caught(rare.id, { weather: "rain", variant: "shimmer" }));
  const page = getJournalEntries(state, "rare_fish")[0];
  assert.equal(page.id, `journal:fish:${rare.id}`);
  assert.match(`${page.title} ${page.body.join(" ")}`, new RegExp(rare.name));
  assert.ok(state.journal.unreadEntryIds.includes(page.id));
  dispatchGameEvent(state, { eventId: "rare-resend", type: "fish.discovered", source: "manual", refs: { fishId: rare.id } });
  assert.equal(state.journal.unreadEntryIds.filter(id => id === page.id).length, 1);
  const reloaded = migrateState(structuredClone(state));
  assert.deepEqual(getJournalEntry(reloaded, page.id), getJournalEntry(state, page.id));
});

test("automatic, offline, and migration sources never invent rare encounter history", () => {
  let journal = createJournalState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  for (const source of ["auto", "offline", "migration"]) {
    journal = applyJournalEvent(journal, { eventId: `ignored:${source}`, type: "fish.discovered", source, sailingDay: 1, refs: { fishId: rare.id } }).state;
  }
  assert.deepEqual(journal.fishEncounterLineById, {});
  assert.equal(journal.unreadEntryIds.includes(`journal:fish:${rare.id}`), false);
});

test("initial categories expose today's essay while story and optional sea records wait for real completion", () => {
  const state = createInitialState();
  const categories = Object.fromEntries(getJournalCategories(state).map(category => [category.id, category]));
  assert.equal(categories.today.unlockedCount, 1);
  assert.equal(categories.rare_fish.unlockedCount, 0);
  assert.deepEqual([categories.sea_events.unlockedCount, categories.sea_events.totalCount], [0, 3]);
  assert.deepEqual([categories.sleeping_tide_bay.unlockedCount, categories.sleeping_tide_bay.totalCount], [0, 6]);
  assert.deepEqual([categories.luminous_archipelago.unlockedCount, categories.luminous_archipelago.totalCount], [0, 6]);
  assert.deepEqual([categories.mist_cape_cold_current.unlockedCount, categories.mist_cape_cold_current.totalCount], [0, 6]);
});

test("completed regional events unlock only their predefined optional sea-condition page", () => {
  const state = createInitialState();
  state.bayEventHistory.silver_tide = { completions: 1, firstCompletedAt: "2026-07-18T01:00:00.000Z", lastCompletedDay: 1 };
  state.journal = syncJournalUnlocks(state);
  assert.deepEqual(getJournalEntries(state, "sea_events").map(page => page.id), [
    "journal:story:sleeping_tide_bay:silver_tide"
  ]);
  assert.equal(getJournalEntries(state, "sleeping_tide_bay").length, 0);
  assert.equal(getJournalEntries(state, "luminous_archipelago").length, 0);
});

test("completed Chengye scenes appear in Luminous chapter order", () => {
  const state = createInitialState();
  state.residentStories.chengye = {
    completedSceneIds: ["chengye_drifting_observer", "chengye_lagoon_margin"],
    rewardIds: []
  };
  state.journal = syncJournalUnlocks(state);
  assert.deepEqual(getJournalEntries(state, "luminous_archipelago").map(page => page.id), [
    "journal:story:luminous_archipelago:chengye_drifting_observer",
    "journal:story:luminous_archipelago:chengye_lagoon_margin"
  ]);
});

test("reading a fixed page clears unread state without affecting today's automatic page", () => {
  const state = createInitialState();
  state.residentStories.lighthouse_keeper = {
    completedSceneIds: ["keeper_returning_light"],
    rewardIds: []
  };
  state.journal = syncJournalUnlocks(state);
  const opening = getJournalEntries(state, "sleeping_tide_bay")[0];
  assert.equal(getJournalUnreadCount(state), 1);
  state.journal = markJournalEntriesRead(state.journal, [opening.id]);
  assert.equal(getJournalUnreadCount(state), 0);
  assert.equal(getJournalEntries(state, "today").length, 1);
});

test("legacy event journals migrate only compatible rare and story reading state", () => {
  const legacy = normalizeJournalState({
    version: 1,
    fishEncounterLineById: { mahi: "舊初遇短句" },
    permanentEntries: [
      { id: "journal:intro", sourceId: "intro:v0.5", title: "舊開篇", body: "舊文字" },
      { id: "journal:fish:mahi", sourceId: "fish:mahi", title: "鬼頭刀", body: "舊文字" },
      { id: "journal:ship:tidewhisper_residence", sourceId: "ship:tidewhisper_residence", title: "舊船頁", body: "舊文字" }
    ],
    dailyEntries: [{ id: "journal:daily:1", body: "舊潮記" }],
    unreadEntryIds: ["journal:fish:mahi"]
  });
  assert.equal(legacy.version, JOURNAL_VERSION);
  assert.ok(legacy.readEntryIds.includes("journal:story:sleeping_tide_bay:opening"));
  assert.ok(legacy.unreadEntryIds.includes("journal:fish:mahi"));
  assert.equal(Object.hasOwn(legacy, "dailyEntries"), false);
  assert.equal(legacy.unreadEntryIds.some(id => id.includes("ship")), false);
});
