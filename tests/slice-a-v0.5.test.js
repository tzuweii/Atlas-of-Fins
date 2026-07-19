import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHENGYE_ID, FISH, LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
  STARLIGHT_OBSERVATION_CAPE_ID, TIDEGLOW_SOURCES
} from "../src/data.js";
import {
  SAVE_VERSION, STARTER_SHIP_ID, TEMP_SAVE_KEY, acceptResidentStory, beginRouteTravel,
  completeResidentStory, createDeveloperState, createInitialState, developerDockRegion, developerResetObservations,
  dispatchGameEvent, dockAtDestination, migrateState, observeAtSpot, progressTravel, recordCatch, updateQuestProgress
} from "../src/core.js";
import { writeStoredState } from "../src/persistence/migrations.js";
import {
  RECENT_GAME_EVENT_LIMIT, consumeGameEvent, createGameEventState, enqueueGameEvent
} from "../src/systems/game-events.js";

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

class MemoryStorage {
  constructor(entries = {}, failOnceKey = null) {
    this.entries = new Map(Object.entries(entries));
    this.failOnceKey = failOnceKey;
  }
  getItem(key) { return this.entries.has(key) ? this.entries.get(key) : null; }
  setItem(key, value) {
    if (key === this.failOnceKey) {
      this.failOnceKey = null;
      throw new Error("quota-exceeded");
    }
    this.entries.set(key, String(value));
  }
  removeItem(key) { this.entries.delete(key); }
}

test("normalized events preserve successful consumers while a failed consumer retries", () => {
  const queued = enqueueGameEvent(createGameEventState(), {
    eventId: "event:retry",
    type: "fish.discovered",
    source: "manual",
    refs: { fishId: "sardine" }
  }, { consumerIds: ["first", "second"] });
  const first = consumeGameEvent(queued.state, "event:retry", {
    first: () => ({ ok: true }),
    second: () => { throw new Error("temporary"); }
  });
  assert.equal(first.complete, false);
  assert.deepEqual(first.event.consumedBy, ["first"]);
  assert.equal(first.event.errorsByConsumer.second, "temporary");

  let firstCalls = 0;
  const retried = consumeGameEvent(first.state, "event:retry", {
    first: () => { firstCalls += 1; },
    second: () => ({ ok: true })
  });
  assert.equal(retried.complete, true);
  assert.equal(firstCalls, 0);
  assert.equal(retried.state.pending.length, 0);
  assert.equal(retried.state.recent[0].eventId, "event:retry");
  assert.deepEqual(retried.state.recent[0].payload, {});
});

test("event IDs deduplicate and acknowledged history remains compact and capped", () => {
  let state = createGameEventState();
  for (let index = 0; index < RECENT_GAME_EVENT_LIMIT + 8; index += 1) {
    const queued = enqueueGameEvent(state, { eventId: `event:${index}`, type: "test", payload: { large: "x".repeat(200) } });
    state = consumeGameEvent(queued.state, queued.event.eventId).state;
  }
  assert.equal(state.recent.length, RECENT_GAME_EVENT_LIMIT);
  assert.deepEqual(state.recent[0].payload, {});
  const duplicate = enqueueGameEvent(state, { eventId: "event:31", type: "test" });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.state.nextSequence, state.nextSequence);
});

test("all six Tideglow sources award once while automatic and migration sources award nothing", () => {
  const state = createInitialState();
  const refsBySource = {
    fish_discovery: { fishId: "sardine" },
    region_arrival: { regionId: "luminous_archipelago" },
    formal_observation: { observationId: "clarks_anemonefish" },
    research_node: { nodeId: "luminous_arrival" },
    region_research: { regionId: "luminous_archipelago" },
    resident_story: { residentId: "chengye", milestoneId: "chengye_drifting_observer" }
  };
  for (const source of TIDEGLOW_SOURCES) {
    dispatchGameEvent(state, {
      type: source.eventType,
      source: "manual",
      refs: refsBySource[source.id]
    }, { consumerIds: ["tideglow"] });
  }
  assert.equal(state.tideglow.total, 17);
  assert.equal(Object.keys(state.tideglow.ledgerBySourceId).length, 6);

  dispatchGameEvent(state, { type: "fish.discovered", source: "manual", refs: { fishId: "sardine" } }, { consumerIds: ["tideglow"] });
  dispatchGameEvent(state, { type: "fish.discovered", source: "auto", refs: { fishId: "anchovy" } }, { consumerIds: ["tideglow"] });
  dispatchGameEvent(state, { type: "region.arrived", source: "migration", refs: { regionId: "future" } }, { consumerIds: ["tideglow"] });
  assert.equal(state.tideglow.total, 17);
});

test("a real first manual catch emits one discovery fact and repeat catches do not re-award", () => {
  const state = createInitialState();
  const caught = {
    uid: "slice-a-sardine",
    fishId: "sardine",
    length: 18,
    weight: 0.16,
    sizeTier: "standard",
    variant: "normal",
    price: 30,
    caughtAt: "2026-07-18T01:00:00.000Z",
    context: { regionId: "sleeping_tide_bay", spotId: "shore", timeId: "dawn", weather: "sunny", baitId: "bread", rodId: "wood", day: 1 }
  };
  const first = recordCatch(state, structuredClone(caught));
  const second = recordCatch(state, { ...structuredClone(caught), uid: "slice-a-sardine-2" });
  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
  assert.equal(state.tideglow.total, 1);
  assert.ok(state.gameEvents.recent.some(event => event.type === "fish.caught"));
  assert.equal(state.gameEvents.recent.filter(event => event.type === "fish.discovered").length, 1);
});

test("first docking, formal observation, research node, and resident story share real Tideglow facts", () => {
  const voyage = createInitialState();
  const startedAt = Date.parse("2026-07-18T00:00:00.000Z");
  const departure = beginRouteTravel(voyage, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, startedAt);
  progressTravel(voyage, startedAt + departure.durationMs + 1);
  const docking = dockAtDestination(voyage, startedAt + departure.durationMs + 2);
  assert.equal(docking.firstArrival, true);
  assert.equal(voyage.tideglow.total, 7);

  const developer = createDeveloperState();
  developerResetObservations(developer);
  developerDockRegion(developer, LUMINOUS_ARCHIPELAGO_ID);
  developer.timeIndex = 0;
  observeAtSpot(developer, STARLIGHT_OBSERVATION_CAPE_ID, () => 1, "2026-07-18T01:00:00.000Z");
  developer.timeIndex = 1;
  const observation = observeAtSpot(developer, STARLIGHT_OBSERVATION_CAPE_ID, () => 1, "2026-07-18T02:00:00.000Z");
  assert.equal(observation.kind, "subject");
  assert.equal(developer.tideglow.total, 5);
  const accepted = acceptResidentStory(developer, CHENGYE_ID);
  assert.equal(accepted.ok, true);
  for (let index = 0; index < accepted.scene.objective.goal; index += 1) {
    updateQuestProgress(developer, {
      type: "catch", source: "manual", fish: FISH[0], caught: { sizeTier: "standard" },
      regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "windrest_shallows", timeId: "day", weather: "sunny"
    });
  }
  assert.equal(completeResidentStory(developer, CHENGYE_ID).ok, true);
  assert.equal(developer.tideglow.total, 6);
});

test("four immutable v4 fixtures migrate to the v5 shell without retroactive rewards", () => {
  for (const name of ["v4-normal-save.json", "v4-progressed-save.json", "v4-developer-save.json", "v4-missing-fields-save.json"]) {
    const raw = fixture(name);
    const migrated = migrateState(raw);
    assert.equal(migrated.version, SAVE_VERSION);
    assert.equal(migrated.tideglow.total, 0, name);
    if (raw.developerMode) assert.deepEqual(migrated.ships.ownedShipIds, [STARTER_SHIP_ID, "tidewhisper_residence", "voyager_study"], name);
    else assert.deepEqual(migrated.ships.ownedShipIds, [STARTER_SHIP_ID], name);
    assert.equal(migrated.ships.activeShipId, STARTER_SHIP_ID, name);
    assert.equal(migrated.journal.version, 2, name);
    assert.equal("permanentEntries" in migrated.journal, false, name);
    assert.deepEqual(migrated.journal.fishEncounterLineById, {}, name);
    assert.equal(migrated.autoFishing.owned, false, name);
    assert.equal(migrated.gameEvents.pending.length, 0, name);
    assert.deepEqual(migrateState(structuredClone(migrated)), migrated, name);
  }
  const normal = fixture("v4-normal-save.json");
  const migrated = migrateState(normal);
  assert.deepEqual(migrated.ships.interiorsByShipId[STARTER_SHIP_ID].ownedFurnitureIds, normal.ownedFurniture);
  assert.equal(migrated.ships.interiorsByShipId[STARTER_SHIP_ID].placedFurniture.light, "lantern");
});

test("staged save writes validate before replacement and roll back a failed primary write", () => {
  const original = JSON.stringify({ version: 4, money: 10 });
  const backup = "exact-backup";
  const storage = new MemoryStorage({ primary: original, backup }, "primary");
  const failed = writeStoredState(storage, createInitialState(), {
    primaryKey: "primary",
    backupKey: "backup",
    temporaryKey: TEMP_SAVE_KEY,
    validate: state => state.version === SAVE_VERSION
  });
  assert.equal(failed.ok, false);
  assert.equal(storage.getItem("primary"), original);
  assert.equal(storage.getItem("backup"), backup);
  assert.equal(storage.getItem(TEMP_SAVE_KEY), null);

  const succeeded = writeStoredState(storage, createInitialState(), {
    primaryKey: "primary",
    backupKey: "backup",
    temporaryKey: TEMP_SAVE_KEY,
    preserveBackup: true,
    validate: state => state.version === SAVE_VERSION
  });
  assert.equal(succeeded.ok, true);
  assert.equal(JSON.parse(storage.getItem("primary")).version, SAVE_VERSION);
  assert.equal(storage.getItem("backup"), backup);
  assert.equal(storage.getItem(TEMP_SAVE_KEY), null);
});
