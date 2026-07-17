import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_KEY, DEV_BACKUP_KEY, DEV_SAVE_KEY, SAVE_KEY, SAVE_VERSION, createInitialState,
  getResidentStoryStatus, isCurrentSaveSchema, migrateState
} from "../src/core.js";
import { CHENGYE_ID } from "../src/data.js";
import { loadStoredState } from "../src/persistence/migrations.js";

class MemoryStorage {
  constructor(entries = {}) {
    this.entries = new Map(Object.entries(entries));
  }
  getItem(key) {
    return this.entries.has(key) ? this.entries.get(key) : null;
  }
  setItem(key, value) {
    this.entries.set(key, String(value));
  }
}

const load = (storage, primaryKey = SAVE_KEY, backupKey = BACKUP_KEY) => loadStoredState(storage, {
  primaryKey,
  backupKey,
  targetVersion: SAVE_VERSION,
  migrate: migrateState,
  requiresMigration: raw => !isCurrentSaveSchema(raw)
});

test("v3 primary save is copied byte-for-byte before v5 migration", () => {
  const rawText = JSON.stringify({
    version: 3,
    money: 432,
    currentQuests: [{ id: "common3", instanceId: "1-0-common3", progress: 2, goal: 3, reward: 85, claimed: false }]
  });
  const storage = new MemoryStorage({ [SAVE_KEY]: rawText, [BACKUP_KEY]: "older-backup" });
  const result = load(storage);
  assert.equal(result.state.version, SAVE_VERSION);
  assert.equal(result.state.money, 432);
  assert.equal(result.state.dailyBoard.entries[0].templateId, "common3");
  assert.equal(result.state.dailyBoard.entries[0].progress, 2);
  assert.equal(storage.getItem(BACKUP_KEY), rawText);
  assert.equal(result.migratedFromVersion, 3);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
});

test("corrupt primary falls back to backup without overwriting the recovery payload", () => {
  const backupText = JSON.stringify({ version: 3, money: 987 });
  const storage = new MemoryStorage({ [SAVE_KEY]: "{broken", [BACKUP_KEY]: backupText });
  const result = load(storage);
  assert.equal(result.sourceKey, BACKUP_KEY);
  assert.equal(result.state.money, 987);
  assert.equal(storage.getItem(BACKUP_KEY), backupText);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
});

test("normal and developer migration keys remain completely isolated", () => {
  const normalText = JSON.stringify({ version: 3, money: 111 });
  const developerText = JSON.stringify({ version: 3, developerMode: true, money: 999999 });
  const storage = new MemoryStorage({
    [SAVE_KEY]: normalText,
    [BACKUP_KEY]: "normal-old",
    [DEV_SAVE_KEY]: developerText,
    [DEV_BACKUP_KEY]: "developer-old"
  });
  const developer = load(storage, DEV_SAVE_KEY, DEV_BACKUP_KEY);
  assert.equal(developer.state.developerMode, true);
  assert.equal(storage.getItem(DEV_BACKUP_KEY), developerText);
  assert.equal(storage.getItem(SAVE_KEY), normalText);
  assert.equal(storage.getItem(BACKUP_KEY), "normal-old");
});

test("current v5 primary reload does not rotate or rewrite its backup", () => {
  const current = createInitialState();
  current.money = 222;
  const v5Text = JSON.stringify(current);
  const storage = new MemoryStorage({ [SAVE_KEY]: v5Text, [BACKUP_KEY]: "recovery" });
  const result = load(storage);
  assert.equal(result.state.version, SAVE_VERSION);
  assert.equal(result.migratedFromVersion, null);
  assert.equal(result.preserveBackupOnWrite, false);
  assert.equal(result.shouldRewritePrimary, false);
  assert.equal(storage.getItem(BACKUP_KEY), "recovery");
});

test("Slice D v5 save is backed up byte-for-byte before Slice E rack normalization", () => {
  const alpha4 = createInitialState();
  alpha4.money = 777;
  alpha4.autoFishing = { owned: false, activeSession: null, lastSummary: null, settledSessionIds: [] };
  const alpha4Text = JSON.stringify(alpha4);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha4Text, [BACKUP_KEY]: "alpha4-recovery" });
  const result = load(storage);
  assert.equal(storage.getItem(BACKUP_KEY), alpha4Text);
  assert.equal(result.migratedFromVersion, 5);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.equal(result.state.money, 777);
  assert.equal(result.state.autoFishing.version, 1);
});

test("Slice A v5 save is backed up before same-version ship catalog normalization", () => {
  const alpha1 = createInitialState();
  delete alpha1.ships.catalogVersion;
  const alpha1Text = JSON.stringify(alpha1);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha1Text, [BACKUP_KEY]: "alpha1-recovery" });
  const result = load(storage);
  assert.equal(storage.getItem(BACKUP_KEY), alpha1Text);
  assert.equal(result.migratedFromVersion, 5);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.state.ships.catalogVersion, 1);
  assert.deepEqual(result.state.ships.ownedShipIds, ["drifting_home"]);
});

test("Slice C v4 state is backed up byte-for-byte before same-version Slice D chart normalization", () => {
  const alpha3 = createInitialState();
  alpha3.version = 4;
  alpha3.money = 444;
  delete alpha3.chartView;
  const alpha3Text = JSON.stringify(alpha3);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha3Text, [BACKUP_KEY]: "older-alpha" });
  const result = load(storage);

  assert.equal(storage.getItem(BACKUP_KEY), alpha3Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.deepEqual(result.state.chartView, { zoom: 1, x: 0, y: 0 });
  assert.equal(result.state.money, 444);
});

test("Slice D v4 state is backed up before Slice E travel history normalization", () => {
  const alpha4 = createInitialState();
  alpha4.version = 4;
  alpha4.money = 555;
  delete alpha4.travelSettings;
  delete alpha4.world.completedRouteIds;
  const alpha4Text = JSON.stringify(alpha4);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha4Text, [BACKUP_KEY]: "older-alpha" });
  const result = load(storage);

  assert.equal(storage.getItem(BACKUP_KEY), alpha4Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.deepEqual(result.state.travelSettings, { developerDurationScale: 1 });
  assert.deepEqual(result.state.world.completedRouteIds, []);
  assert.deepEqual(result.state.world.unlockedRouteIds, ["sleeping_tide_to_luminous_archipelago"]);
  assert.equal(result.state.money, 555);
});

test("Slice E v4 state is backed up before Slice F regional event normalization", () => {
  const alpha5 = createInitialState();
  alpha5.version = 4;
  alpha5.money = 666;
  delete alpha5.regionEvents;
  const alpha5Text = JSON.stringify(alpha5);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha5Text, [BACKUP_KEY]: "older-alpha" });
  const result = load(storage);

  assert.equal(storage.getItem(BACKUP_KEY), alpha5Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.equal(result.state.regionEvents.sleeping_tide_bay.eventId, "silver_tide");
  assert.equal(result.state.regionEvents.luminous_archipelago.eventId, "prism_sunshower");
  assert.equal(result.state.money, 666);
});

test("Slice F v4 state is backed up before Slice G observation and story normalization", () => {
  const alpha6 = createInitialState();
  alpha6.version = 4;
  alpha6.money = 777;
  delete alpha6.observations;
  delete alpha6.residentStories;
  const alpha6Text = JSON.stringify(alpha6);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha6Text, [BACKUP_KEY]: "older-alpha" });
  const result = load(storage);

  assert.equal(storage.getItem(BACKUP_KEY), alpha6Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.deepEqual(result.state.observations, {
    recordsById: {}, wonderRecordsById: {}, attemptsById: {}, visitedPeriodKeys: []
  });
  assert.deepEqual(result.state.residentStories, {});
  const story = getResidentStoryStatus(result.state, CHENGYE_ID);
  assert.equal(story.completedSceneIds.length, 0);
  assert.equal(story.scenes.length, 6);
  assert.equal(result.state.money, 777);
});

test("Slice G v4 state is backed up before Slice H display setting normalization", () => {
  const alpha7 = createInitialState();
  alpha7.version = 4;
  alpha7.money = 888;
  delete alpha7.settings.textScale;
  delete alpha7.settings.uiScale;
  const alpha7Text = JSON.stringify(alpha7);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha7Text, [BACKUP_KEY]: "older-alpha" });
  const result = load(storage);

  assert.equal(storage.getItem(BACKUP_KEY), alpha7Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.equal(result.state.settings.textScale, "standard");
  assert.equal(result.state.settings.uiScale, "standard");
  assert.equal(result.state.money, 888);
});

test("Slice A v5 state is backed up byte-for-byte before same-version Slice B normalization", () => {
  const alpha2Text = JSON.stringify({
    version: 4,
    day: 1,
    money: 333,
    currentQuests: [{ id: "common3", instanceId: "1-0-common3", progress: 1, goal: 3, reward: 85, claimed: false }]
  });
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha2Text, [BACKUP_KEY]: "older-v4" });
  const result = load(storage);
  assert.equal(storage.getItem(BACKUP_KEY), alpha2Text);
  assert.equal(result.migratedFromVersion, 4);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.equal(result.state.dailyBoard.entries[0].progress, 1);
  assert.ok(result.state.residentCommissions);
});

test("Slice B v5 save is backed up before same-version Slice C interior normalization", () => {
  const alpha2 = createInitialState();
  delete alpha2.ships.interiorVersion;
  const alpha2Text = JSON.stringify(alpha2);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha2Text, [BACKUP_KEY]: "alpha2-recovery" });
  const result = load(storage);
  assert.equal(storage.getItem(BACKUP_KEY), alpha2Text);
  assert.equal(result.migratedFromVersion, 5);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.state.ships.interiorVersion, 1);
  assert.deepEqual(result.state.ships.interiorsByShipId.drifting_home.ownedFurnitureIds, ["sleeping_bag"]);
});

test("Slice C v5 save is backed up before same-version Slice D journal normalization", () => {
  const alpha3 = createInitialState();
  alpha3.journal = {
    introCreated: true,
    fishEncounterLineById: {},
    permanentEntries: [{
      id: "journal:intro", eventId: null, type: "intro", sailingDay: 1, occurredAt: null,
      title: "把潮聲整理成冊", body: "今天，我開始把走過的潮聲整理成冊。", refs: {}
    }],
    dailyEntries: [],
    dailyArchives: [],
    unreadEntryIds: ["journal:intro"]
  };
  const alpha3Text = JSON.stringify(alpha3);
  const storage = new MemoryStorage({ [SAVE_KEY]: alpha3Text, [BACKUP_KEY]: "alpha3-recovery" });
  const result = load(storage);
  assert.equal(storage.getItem(BACKUP_KEY), alpha3Text);
  assert.equal(result.migratedFromVersion, 5);
  assert.equal(result.preserveBackupOnWrite, true);
  assert.equal(result.shouldRewritePrimary, true);
  assert.equal(result.state.journal.version, 1);
  assert.equal(result.state.journal.permanentEntries.length, 1);
  assert.deepEqual(result.state.journal.fishEncounterLineById, {});
});
