import test from "node:test";
import assert from "node:assert/strict";
import {
  CHENGYE_ID, COMMISSION_TEMPLATES, FISH_MARKET_OWNER_ID, LIGHTHOUSE_KEEPER_ID,
  LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID, RESIDENTS, SLEEPING_TIDE_BAY_ID,
  WUHE_ID, getResidentCommissionTemplates
} from "../src/data.js";
import {
  acceptResidentCommission, advanceTime, createDeveloperState, createInitialState,
  deliverResidentCommission, developerClearResidentCommissionHistory, developerCompleteResidentCommission,
  developerSetDailyGoal, developerSetResidentOffer, dropResidentCommission, updateProgressEvent
} from "../src/core.js";
import { normalizeResidentCommissionState, refreshResidentOffers } from "../src/systems/resident-commissions.js";

const manualCommonCatch = (source = "manual") => ({
  type: "catch",
  source,
  fish: { id: "sardine", rarity: "common", tags: ["small"] },
  caught: { sizeTier: "standard" },
  baitId: "bread",
  regionId: SLEEPING_TIDE_BAY_ID,
  spotId: "shore",
  timeId: "dawn",
  weather: "sunny"
});

test("port residents stay local and own calm commission templates", () => {
  const sleepingResidents = RESIDENTS.filter(resident => resident.regionId === SLEEPING_TIDE_BAY_ID);
  const chengye = RESIDENTS.find(resident => resident.id === CHENGYE_ID);
  const wuhe = RESIDENTS.find(resident => resident.id === WUHE_ID);
  assert.deepEqual(sleepingResidents.map(resident => resident.name), ["燈塔守望者", "魚市場老闆"]);
  assert.ok(sleepingResidents.every(resident => resident.portLocationId && resident.dialogue.greeting));
  assert.equal(COMMISSION_TEMPLATES.length, 18);
  assert.equal(getResidentCommissionTemplates(LIGHTHOUSE_KEEPER_ID).length, 4);
  assert.equal(getResidentCommissionTemplates(FISH_MARKET_OWNER_ID).length, 4);
  assert.equal(chengye.name, "澄野");
  assert.equal(chengye.regionId, LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(getResidentCommissionTemplates(CHENGYE_ID).length, 5);
  assert.equal(wuhe.name, "霧禾");
  assert.equal(wuhe.regionId, MIST_CAPE_COLD_CURRENT_ID);
  assert.equal(getResidentCommissionTemplates(WUHE_ID).length, 5);
  assert.ok(COMMISSION_TEMPLATES.every(template => ["coins", "bait"].includes(template.reward.type)
    && !["observe", "wonder"].includes(template.condition.eventType)));
});

test("resident offers are deterministic on the same sailing day and repair invalid saved content", () => {
  const state = createInitialState();
  const snapshot = structuredClone(state.residentCommissions);
  const context = {
    availableRegionIds: [SLEEPING_TIDE_BAY_ID],
    availableSpotIds: ["shore", "reef"],
    availableBaitIds: ["bread", "shrimp"],
    availableFishIds: ["sardine"],
    fishCatalog: [{ id: "sardine", rarity: "common", tags: ["small"] }]
  };
  assert.deepEqual(refreshResidentOffers(snapshot, state.day, context), snapshot);

  const repaired = normalizeResidentCommissionState({
    offerDayByResident: { [LIGHTHOUSE_KEEPER_ID]: 1 },
    offersByResident: { [LIGHTHOUSE_KEEPER_ID]: { residentId: LIGHTHOUSE_KEEPER_ID, templateId: "deleted-template" } },
    active: { residentId: "deleted-resident", templateId: "deleted-template" },
    history: { deleted: { completions: 99 } }
  }, 1, context);
  assert.equal(repaired.active, null);
  assert.equal(repaired.offersByResident[LIGHTHOUSE_KEEPER_ID], undefined);
  assert.deepEqual(repaired.history, {});
});

test("only one commission can be active and it persists across sailing days", () => {
  const state = createInitialState();
  const keeperOffer = state.residentCommissions.offersByResident[LIGHTHOUSE_KEEPER_ID];
  assert.ok(keeperOffer);
  assert.equal(acceptResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);
  assert.equal(acceptResidentCommission(state, FISH_MARKET_OWNER_ID).ok, false);
  const instanceId = state.residentCommissions.active.instanceId;

  state.timeIndex = 3;
  advanceTime(state, () => 1);
  assert.equal(state.day, 2);
  assert.equal(state.residentCommissions.active.instanceId, instanceId);
  assert.equal(state.residentCommissions.active.acceptedDay, 1);
  assert.equal(state.residentCommissions.offerDayByResident[FISH_MARKET_OWNER_ID], 2);
});

test("one manual catch advances daily and resident progress together while automatic catches do not", () => {
  const state = createDeveloperState();
  assert.equal(developerSetDailyGoal(state, 0, "common3"), true);
  assert.equal(developerSetResidentOffer(state, LIGHTHOUSE_KEEPER_ID, "keeper_common_current"), true);
  assert.equal(acceptResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);

  updateProgressEvent(state, manualCommonCatch());
  assert.equal(state.dailyBoard.entries[0].progress, 1);
  assert.equal(state.residentCommissions.active.progress, 1);
  updateProgressEvent(state, manualCommonCatch("automatic"));
  assert.equal(state.dailyBoard.entries[0].progress, 1);
  assert.equal(state.residentCommissions.active.progress, 1);
});

test("delivery requires the correct resident and dock, rewards once, and records history", () => {
  const state = createDeveloperState();
  assert.equal(developerSetResidentOffer(state, LIGHTHOUSE_KEEPER_ID, "keeper_common_current"), true);
  assert.equal(acceptResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);
  assert.equal(developerCompleteResidentCommission(state), true);
  assert.equal(deliverResidentCommission(state, FISH_MARKET_OWNER_ID).ok, false);

  state.world.docking = { status: "traveling", regionId: null };
  assert.equal(deliverResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, false);
  state.world.docking = { status: "docked", regionId: SLEEPING_TIDE_BAY_ID };
  const moneyBefore = state.money;
  const delivered = deliverResidentCommission(state, LIGHTHOUSE_KEEPER_ID);
  assert.equal(delivered.ok, true);
  assert.equal(state.money, moneyBefore + 80);
  assert.equal(state.residentCommissions.active, null);
  assert.equal(state.residentCommissions.history[LIGHTHOUSE_KEEPER_ID].completions, 1);
  assert.deepEqual(state.residentCommissions.history[LIGHTHOUSE_KEEPER_ID].completedTemplateIds, ["keeper_common_current"]);
  assert.equal(deliverResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, false);
  assert.equal(state.money, moneyBefore + 80);
});

test("dropping is penalty-free, does not redraw today, and refreshes next sailing day", () => {
  const state = createInitialState();
  const moneyBefore = state.money;
  assert.equal(acceptResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);
  assert.equal(dropResidentCommission(state).ok, true);
  assert.equal(state.money, moneyBefore);
  assert.equal(state.residentCommissions.active, null);
  assert.equal(state.residentCommissions.offersByResident[LIGHTHOUSE_KEEPER_ID], undefined);

  state.timeIndex = 3;
  advanceTime(state, () => 1);
  assert.ok(state.residentCommissions.offersByResident[LIGHTHOUSE_KEEPER_ID]);
});

test("bait rewards and developer history controls use the same production state", () => {
  const state = createDeveloperState();
  assert.equal(developerSetResidentOffer(state, LIGHTHOUSE_KEEPER_ID, "keeper_gentle_light"), true);
  assert.equal(acceptResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);
  assert.equal(developerCompleteResidentCommission(state), true);
  const baitBefore = state.baitAmounts.bread;
  assert.equal(deliverResidentCommission(state, LIGHTHOUSE_KEEPER_ID).ok, true);
  assert.equal(state.baitAmounts.bread, baitBefore + 4);
  assert.equal(developerClearResidentCommissionHistory(state), true);
  assert.deepEqual(state.residentCommissions.history, {});
});
