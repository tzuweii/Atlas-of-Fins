import test from "node:test";
import assert from "node:assert/strict";
import {
  LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  SAVE_VERSION, beginRouteTravel, createDeveloperState, createInitialState, dockAtDestination,
  migrateState, progressTravel
} from "../src/core.js";
import {
  DEFAULT_SOUND_VOLUME, TEXT_SCALE_OPTIONS, UI_SCALE_OPTIONS, normalizeDisplaySettings,
  normalizeSoundVolume, normalizeTextScale, normalizeUiScale
} from "../src/systems/accessibility.js";
import { createPortableSave, parsePortableSave } from "../src/persistence/portable-save.js";
import { grantChapterOneRoute } from "./story-route-helper.js";

test("Slice H display settings provide three text sizes and independent UI scaling", () => {
  assert.deepEqual(TEXT_SCALE_OPTIONS.map(option => option.id), ["small", "standard", "large"]);
  assert.deepEqual(UI_SCALE_OPTIONS.map(option => option.id), ["compact", "standard", "large"]);
  assert.equal(normalizeTextScale("unknown"), "standard");
  assert.equal(normalizeUiScale(2), "standard");
  assert.equal(normalizeSoundVolume(undefined), DEFAULT_SOUND_VOLUME);
  assert.equal(normalizeSoundVolume("65"), 65);
  assert.equal(normalizeSoundVolume(140), 100);
  assert.equal(normalizeSoundVolume(-20), 0);
  assert.deepEqual(normalizeDisplaySettings({ sound: false, soundVolume: 65, reducedMotion: true, textScale: "large", uiScale: "compact" }), {
    sound: false,
    soundVolume: 65,
    reducedMotion: false,
    textScale: "large",
    uiScale: "compact"
  });
});

test("portable saves round-trip current and legacy state without crossing save modes", () => {
  const normal = createInitialState();
  normal.money = 4321;
  normal.settings.textScale = "large";
  const encoded = createPortableSave(normal, { mode: "normal", exportedAt: "2026-07-17T00:00:00.000Z" });
  const imported = parsePortableSave(encoded, { expectedMode: "normal", maxSaveVersion: SAVE_VERSION, migrate: migrateState });
  assert.equal(imported.ok, true);
  assert.equal(imported.state.money, 4321);
  assert.equal(imported.state.settings.textScale, "large");
  assert.equal(imported.exportedAt, "2026-07-17T00:00:00.000Z");
  assert.equal(parsePortableSave(encoded, { expectedMode: "developer", migrate: migrateState }).reason, "mode-mismatch");

  const developer = createDeveloperState();
  const developerEncoded = createPortableSave(developer, { mode: "developer" });
  assert.equal(parsePortableSave(developerEncoded, { expectedMode: "normal", migrate: migrateState }).reason, "mode-mismatch");
  assert.equal(parsePortableSave("{broken", { expectedMode: "normal", migrate: migrateState }).reason, "invalid-json");
  assert.equal(parsePortableSave(JSON.stringify({ state: normal }), { expectedMode: "normal", migrate: migrateState }).reason, "invalid-format");

  const legacyEnvelope = JSON.parse(encoded);
  legacyEnvelope.saveVersion = 1;
  legacyEnvelope.state = { version: 1, money: 246, discovered: {} };
  const legacy = parsePortableSave(JSON.stringify(legacyEnvelope), { expectedMode: "normal", maxSaveVersion: SAVE_VERSION, migrate: migrateState });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.state.version, SAVE_VERSION);
  assert.equal(legacy.state.money, 246);

  const futureEnvelope = JSON.parse(encoded);
  futureEnvelope.saveVersion = 99;
  futureEnvelope.state.version = 99;
  assert.equal(parsePortableSave(JSON.stringify(futureEnvelope), {
    expectedMode: "normal", maxSaveVersion: SAVE_VERSION, migrate: migrateState
  }).reason, "unsupported-version");
});

test("two hundred and forty serialized voyages preserve regional research context", () => {
  let state = createInitialState();
  grantChapterOneRoute(state);
  let now = Date.parse("2026-07-17T00:00:00.000Z");
  let luminousFirstArrival = null;

  for (let trip = 0; trip < 240; trip += 1) {
    const departure = beginRouteTravel(state, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, now);
    assert.equal(departure.ok, true);
    now += departure.durationMs + 1000;
    const arrival = progressTravel(state, now);
    assert.equal(arrival.arrived, true);
    now += 1000;
    const docking = dockAtDestination(state, now);
    assert.equal(docking.ok, true);

    if (state.world.currentRegionId === LUMINOUS_ARCHIPELAGO_ID) {
      const progress = state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID];
      progress.caughtSpotIds = [...new Set([...(progress.caughtSpotIds || []), "prism_coral_garden"] )];
      progress.caughtTimeIds = [...new Set([...(progress.caughtTimeIds || []), "night"] )];
      luminousFirstArrival ||= progress.firstArrivedAt;
      assert.deepEqual(progress.caughtSpotIds, ["prism_coral_garden"]);
      assert.deepEqual(progress.caughtTimeIds, ["night"]);
      assert.equal(progress.firstArrivedAt, luminousFirstArrival);
    }

    if (trip % 12 === 11) state = migrateState(JSON.parse(JSON.stringify(state)));
  }

  assert.equal(state.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(state.world.completedRouteIds, [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID]);
  assert.deepEqual(state.world.visitedRegionIds, [SLEEPING_TIDE_BAY_ID, LUMINOUS_ARCHIPELAGO_ID]);
  assert.deepEqual(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].caughtSpotIds, ["prism_coral_garden"]);
  assert.deepEqual(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].caughtTimeIds, ["night"]);
});
