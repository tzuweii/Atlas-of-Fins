import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_KEY, DEV_BACKUP_KEY, DEV_SAVE_KEY, SAVE_KEY, SAVE_VERSION, isCurrentSaveSchema, migrateState
} from "../src/core.js";
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

test("v3 primary save is copied byte-for-byte before v4 migration", () => {
  const rawText = JSON.stringify({
    version: 3,
    money: 432,
    currentQuests: [{ id: "common3", instanceId: "1-0-common3", progress: 2, goal: 3, reward: 85, claimed: false }]
  });
  const storage = new MemoryStorage({ [SAVE_KEY]: rawText, [BACKUP_KEY]: "older-backup" });
  const result = load(storage);
  assert.equal(result.state.version, 4);
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

test("current v4 primary reload does not rotate or rewrite its backup", () => {
  const v4Text = JSON.stringify({
    version: 4,
    money: 222,
    dailyBoard: { day: 1, entries: [] },
    residentCommissions: { offerDayByResident: {}, offersByResident: {}, active: null, history: {} }
  });
  const storage = new MemoryStorage({ [SAVE_KEY]: v4Text, [BACKUP_KEY]: "recovery" });
  const result = load(storage);
  assert.equal(result.state.version, 4);
  assert.equal(result.migratedFromVersion, null);
  assert.equal(result.preserveBackupOnWrite, false);
  assert.equal(result.shouldRewritePrimary, false);
  assert.equal(storage.getItem(BACKUP_KEY), "recovery");
});

test("Slice B v4 state is backed up byte-for-byte before same-version Slice C normalization", () => {
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
