import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH, JOURNAL_EVENT_TEMPLATES, LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  advanceTime, beginRouteTravel, buyShip, createDeveloperState, createInitialState,
  developerEmitJournalEvent, developerFillJournalArchive, dispatchGameEvent, filterJournalEntries,
  markJournalEntriesRead, migrateState, recordCatch
} from "../src/core.js";
import {
  DAILY_JOURNAL_LIMIT, allJournalEntries, applyJournalEvent, createJournalState, sealJournalDay
} from "../src/systems/journal.js";

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

test("journal templates own unique normalized event types", () => {
  assert.equal(JOURNAL_EVENT_TEMPLATES.length, 11);
  assert.equal(new Set(JOURNAL_EVENT_TEMPLATES.map(template => template.id)).size, JOURNAL_EVENT_TEMPLATES.length);
  assert.equal(new Set(JOURNAL_EVENT_TEMPLATES.map(template => template.eventType)).size, JOURNAL_EVENT_TEMPLATES.length);
  assert.ok(JOURNAL_EVENT_TEMPLATES.every(template => template.permanent));
});

test("every new fish gets one encounter line while common and uncommon fish get no empty page", () => {
  const state = createInitialState();
  const common = FISH.find(fish => fish.rarity === "common");
  const uncommon = FISH.find(fish => fish.rarity === "uncommon");
  recordCatch(state, caught(common.id));
  recordCatch(state, caught(uncommon.id, { uid: "journal-uncommon", caughtAt: "2026-07-18T02:00:00.000Z" }));
  const firstLine = state.journal.fishEncounterLineById[common.id];
  assert.match(firstLine, new RegExp(common.name));
  assert.match(state.journal.fishEncounterLineById[uncommon.id], new RegExp(uncommon.name));
  assert.equal(state.journal.permanentEntries.filter(entry => entry.sourceId === `fish:${common.id}`).length, 0);
  assert.equal(state.journal.permanentEntries.filter(entry => entry.sourceId === `fish:${uncommon.id}`).length, 0);
  recordCatch(state, caught(common.id, { uid: "journal-common-repeat", caughtAt: "2026-07-18T03:00:00.000Z" }));
  assert.equal(state.journal.fishEncounterLineById[common.id], firstLine);
});

test("rare fish receive one immutable full encounter page even when events are resent", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  recordCatch(state, caught(rare.id, { weather: "rain", variant: "shimmer" }));
  const page = state.journal.permanentEntries.find(entry => entry.sourceId === `fish:${rare.id}`);
  assert.ok(page);
  assert.match(page.body, new RegExp(rare.name));
  assert.ok(page.poeticLine.length > 10);
  const savedText = `${page.title}\n${page.body}\n${page.poeticLine}`;
  dispatchGameEvent(state, { eventId: "rare-resend", type: "fish.discovered", source: "manual", refs: { fishId: rare.id } });
  assert.equal(state.journal.permanentEntries.filter(entry => entry.sourceId === `fish:${rare.id}`).length, 1);
  const reloaded = migrateState(structuredClone(state));
  const reloadedPage = reloaded.journal.permanentEntries.find(entry => entry.sourceId === `fish:${rare.id}`);
  assert.equal(`${reloadedPage.title}\n${reloadedPage.body}\n${reloadedPage.poeticLine}`, savedText);
});

test("automatic, offline, and migration sources never invent encounter history", () => {
  let journal = createJournalState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  for (const source of ["auto", "offline", "migration"]) {
    journal = applyJournalEvent(journal, { eventId: `ignored:${source}`, type: "fish.discovered", source, sailingDay: 1, refs: { fishId: rare.id } }).state;
  }
  assert.deepEqual(journal.fishEncounterLineById, {});
  assert.equal(journal.permanentEntries.length, 1);

  const legacy = migrateState({ version: 4, discovered: { [rare.id]: { count: 9, bestLength: 30, bestWeight: 2 } } });
  assert.deepEqual(legacy.journal.fishEncounterLineById, {});
  assert.equal(legacy.journal.permanentEntries.length, 1);
});

test("today tide notes merge meaningful facts once and seal without later rewriting", () => {
  const state = createInitialState();
  const common = FISH.find(fish => fish.rarity === "common");
  recordCatch(state, caught(common.id, { variant: "shimmer", weather: "rain" }));
  const draft = state.journal.dailyEntries[0];
  assert.equal(state.journal.dailyEntries.length, 1);
  assert.equal(draft.sealed, false);
  assert.match(draft.body, /閃光/);
  assert.match(draft.body, /細雨/);
  assert.ok(draft.poeticLine.length > 10);

  dispatchGameEvent(state, { eventId: "same-rain-fact", type: "fish.caught", source: "manual", refs: { fishId: common.id }, payload: { caught: { variant: "normal" } }, weatherId: "rain" });
  assert.equal(state.journal.dailyEntries.length, 1);
  assert.equal(state.journal.dailyEntries[0].facts.filter(fact => fact.key.startsWith("rain:")).length, 1);
  for (let index = 0; index < 4; index += 1) advanceTime(state, () => 1);
  const sealed = state.journal.dailyEntries.find(entry => entry.sailingDay === 1);
  assert.equal(sealed.sealed, true);
  const sealedText = `${sealed.body}\n${sealed.poeticLine}`;
  dispatchGameEvent(state, { eventId: "late-day-one", type: "region.revisited", source: "manual", sailingDay: 1, refs: { regionId: "sleeping_tide_bay" } });
  assert.equal(`${state.journal.dailyEntries.find(entry => entry.sailingDay === 1).body}\n${sealed.poeticLine}`, sealedText);
});

test("daily notes archive the oldest ten-day batch after the 180-page limit", () => {
  const state = createDeveloperState();
  const permanentBefore = structuredClone(state.journal.permanentEntries);
  assert.equal(developerFillJournalArchive(state, 181), true);
  assert.ok(state.journal.dailyEntries.length <= DAILY_JOURNAL_LIMIT);
  assert.equal(state.journal.dailyEntries.length, 171);
  assert.equal(state.journal.dailyArchives.length, 1);
  assert.equal(state.journal.dailyArchives[0].stats.entryCount, 10);
  assert.deepEqual(state.journal.permanentEntries, permanentBefore);
  assert.ok(JSON.stringify(state.journal).length < 500_000);
  assert.equal(developerFillJournalArchive(state, 181), true);
  assert.equal(state.journal.dailyEntries.length, 171);
  assert.equal(state.journal.dailyArchives.length, 1);
  const reloaded = migrateState(structuredClone(state));
  assert.equal(reloaded.journal.dailyEntries.length, 171);
  assert.equal(reloaded.journal.dailyArchives.length, 1);
});

test("permanent route, ship, research, and world pages use stable source IDs", () => {
  const state = createInitialState();
  beginRouteTravel(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, Date.parse("2026-07-18T00:00:00.000Z"));
  assert.equal(filterJournalEntries(state.journal, "route", SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID).length, 1);
  state.world.travel = null;
  state.world.docking = { status: "docked", regionId: "sleeping_tide_bay" };
  state.money = 5000;
  state.tideglow.total = 20;
  buyShip(state, "tidewhisper_residence", "2026-07-18T03:00:00.000Z");
  assert.equal(filterJournalEntries(state.journal, "ship", "tidewhisper_residence").length, 1);

  const developer = createDeveloperState();
  const first = developerEmitJournalEvent(developer, "world.completed", {}, "developer:world-complete");
  const second = developerEmitJournalEvent(developer, "world.completed", {}, "developer:world-complete");
  assert.equal(first.results.journal.createdEntries.length, 1);
  assert.equal(second.duplicate, true);
  assert.equal(developer.journal.permanentEntries.filter(entry => entry.sourceId === "world-complete").length, 1);
});

test("unread state, queued notices, filters, and read actions remain independent", () => {
  const state = createInitialState();
  const rare = FISH.find(fish => fish.rarity === "rare");
  recordCatch(state, caught(rare.id));
  const page = filterJournalEntries(state.journal, "fish", rare.id)[0];
  assert.ok(state.journal.pendingNoticeEntryIds.includes(page.id));
  assert.ok(state.journal.unreadEntryIds.includes(page.id));
  const read = markJournalEntriesRead(state.journal, [page.id]);
  assert.equal(read.unreadEntryIds.includes(page.id), false);
  assert.equal(read.pendingNoticeEntryIds.includes(page.id), true);
  assert.ok(filterJournalEntries(read, "permanent").some(entry => entry.id === page.id));
  assert.ok(filterJournalEntries(read, "day", 1).some(entry => entry.id === page.id));
  assert.equal(filterJournalEntries(read, "day", 2).some(entry => entry.id === page.id), false);
  assert.ok(allJournalEntries(read).some(entry => entry.type === "intro"));
});

test("sealing an empty day never creates a fictional daily page", () => {
  const journal = sealJournalDay(createJournalState(), 1);
  assert.deepEqual(journal.dailyEntries, []);
  assert.deepEqual(journal.dailyArchives, []);
});
