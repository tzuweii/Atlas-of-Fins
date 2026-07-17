import test from "node:test";
import assert from "node:assert/strict";
import {
  FURNITURE, SHIP_FURNITURE, SHIP_INTERIOR_SCENES, SHIP_LIGHTING, SHIP_SLOT_TYPES,
  getShipFurniture
} from "../src/data.js";
import {
  activeShipSpeed, buyShip, buyShipFurniture, collectInvalidInteriorReferences, createDeveloperState,
  createInitialState, developerClearActiveShipFurniture, developerFillActiveShipFurniture,
  developerResetActiveShipSlots, developerSetActiveShipLighting, isCurrentSaveSchema, migrateState,
  placeShipFurniture, shipInterior, switchActiveShip
} from "../src/core.js";

const slotIds = SHIP_SLOT_TYPES.map(slot => slot.id);

test("three implemented ships share slot types but keep independent scenes and furniture catalogs", () => {
  assert.equal(SHIP_INTERIOR_SCENES.length, 3);
  assert.equal(new Set(SHIP_INTERIOR_SCENES.map(scene => scene.theme)).size, 3);
  assert.equal(new Set(SHIP_INTERIOR_SCENES.map(scene => scene.aquariumFrameId)).size, 3);
  for (const scene of SHIP_INTERIOR_SCENES) {
    assert.deepEqual(Object.keys(scene.slots), slotIds);
    assert.deepEqual(scene.fixedStructures.map(item => item.id), ["sleep_platform", "chart_table", "journal_shelf", "aquarium_plinth"]);
  }
  assert.deepEqual(SHIP_INTERIOR_SCENES.map(scene => getShipFurniture(scene.shipId).length), [10, 8, 8]);
  assert.equal(new Set(SHIP_FURNITURE.map(item => item.id)).size, SHIP_FURNITURE.length);
  assert.deepEqual(FURNITURE.map(item => item.id), getShipFurniture("drifting_home").map(item => item.id));
});

test("second and third ship furniture uses the confirmed rounded 15 and 30 percent prices", () => {
  const baseById = Object.fromEntries(FURNITURE.map(item => [item.id, item]));
  for (const item of SHIP_FURNITURE.filter(entry => entry.baseItemId)) {
    const expected = Math.round(baseById[item.baseItemId].price * item.priceTier / 10) * 10;
    assert.equal(item.price, expected, item.id);
  }
  assert.deepEqual(getShipFurniture("tidewhisper_residence").map(item => item.price), [180, 550, 150, 370, 280, 220, 240, 670]);
  assert.deepEqual(getShipFurniture("voyager_study").map(item => item.price), [210, 620, 170, 420, 310, 250, 270, 750]);
});

test("new ships begin with fixed structures but no free replaceable furniture", () => {
  const state = createInitialState();
  assert.deepEqual(shipInterior(state).ownedFurnitureIds, ["sleeping_bag"]);
  state.money = 5000;
  state.tideglow.total = 20;
  const purchase = buyShip(state, "tidewhisper_residence");
  assert.equal(purchase.ok, true);
  assert.deepEqual(shipInterior(state).ownedFurnitureIds, []);
  assert.deepEqual(Object.values(shipInterior(state).placedFurniture), [null, null, null, null, null]);
  assert.equal(shipInterior(state).aquariumFrameId, "seafoam-ceramic");
});

test("active ship catalog purchases and placement remain isolated per ship", () => {
  const state = createInitialState();
  state.money = 5000;
  state.tideglow.total = 20;
  buyShip(state, "tidewhisper_residence");
  const before = state.money;
  assert.equal(buyShipFurniture(state, "blanket").reason, "wrong-ship");
  const bought = buyShipFurniture(state, "tidewhisper_woven_quilt");
  assert.equal(bought.ok, true);
  assert.equal(state.money, before - 180);
  assert.equal(shipInterior(state).placedFurniture.sleep, "tidewhisper_woven_quilt");
  assert.equal(placeShipFurniture(state, "sleeping_bag").reason, "wrong-ship");
  switchActiveShip(state, "drifting_home");
  assert.deepEqual(shipInterior(state).ownedFurnitureIds, ["sleeping_bag"]);
  assert.equal(state.ownedFurniture.includes("tidewhisper_woven_quilt"), false);
});

test("same-version Slice B saves normalize all owned interiors without inventing furniture", () => {
  const alpha2 = createInitialState();
  alpha2.money = 5000;
  alpha2.tideglow.total = 20;
  buyShip(alpha2, "tidewhisper_residence");
  delete alpha2.ships.interiorVersion;
  alpha2.ships.interiorsByShipId.tidewhisper_residence = {
    ownedFurnitureIds: ["tidewhisper_woven_quilt", "blanket", "missing"],
    placedFurniture: { sleep: "blanket", wall: "missing" },
    lightingId: "strobe",
    aquariumFrameId: "wrong"
  };
  assert.equal(isCurrentSaveSchema(alpha2), false);
  const migrated = migrateState(alpha2);
  assert.equal(migrated.ships.interiorVersion, 1);
  assert.deepEqual(migrated.ships.interiorsByShipId.tidewhisper_residence.ownedFurnitureIds, ["tidewhisper_woven_quilt"]);
  assert.deepEqual(Object.values(migrated.ships.interiorsByShipId.tidewhisper_residence.placedFurniture), [null, null, null, null, null]);
  assert.equal(migrated.ships.interiorsByShipId.tidewhisper_residence.lightingId, "default");
  assert.equal(migrated.ships.interiorsByShipId.tidewhisper_residence.aquariumFrameId, "seafoam-ceramic");
  assert.deepEqual(collectInvalidInteriorReferences(migrated), []);
});

test("three hundred ship switches never clone or reorder the global aquarium", () => {
  const state = createDeveloperState();
  const before = structuredClone(state.aquarium);
  const inventoryBefore = structuredClone(state.catchInventory);
  const cycle = ["drifting_home", "tidewhisper_residence", "voyager_study"];
  for (let index = 0; index < 300; index += 1) {
    const result = switchActiveShip(state, cycle[index % cycle.length]);
    assert.equal(result.ok, true);
  }
  assert.deepEqual(state.aquarium, before);
  assert.deepEqual(state.catchInventory, inventoryBefore);
  assert.equal(new Set(state.aquarium.fish.map(item => item.uid)).size, state.aquarium.fish.length);
});

test("developer interior controls fill, clear, reset, light, and report invalid references", () => {
  const state = createDeveloperState();
  assert.equal(developerClearActiveShipFurniture(state), true);
  assert.deepEqual(shipInterior(state).ownedFurnitureIds, []);
  assert.equal(developerFillActiveShipFurniture(state), true);
  assert.equal(shipInterior(state).ownedFurnitureIds.length, getShipFurniture("voyager_study").length);
  assert.equal(Object.values(shipInterior(state).placedFurniture).filter(Boolean).length, 5);
  assert.equal(developerResetActiveShipSlots(state), true);
  assert.equal(Object.values(shipInterior(state).placedFurniture).filter(Boolean).length, 0);
  assert.equal(developerSetActiveShipLighting(state, "warm"), true);
  assert.equal(shipInterior(state).lightingId, "warm");
  assert.equal(developerSetActiveShipLighting(state, "strobe"), false);
  assert.deepEqual(SHIP_LIGHTING.map(option => option.id), ["default", "warm", "dim"]);

  state.ships.interiorsByShipId.voyager_study.placedFurniture.wall = "missing";
  state.ships.interiorsByShipId.voyager_study.aquariumFrameId = "wrong";
  assert.deepEqual(collectInvalidInteriorReferences(state).map(problem => problem.reason), ["missing-furniture", "invalid-frame"]);
});

test("furniture is cosmetic and never changes the active ship speed", () => {
  const state = createDeveloperState();
  const before = activeShipSpeed(state);
  developerClearActiveShipFurniture(state);
  assert.equal(activeShipSpeed(state), before);
  developerFillActiveShipFurniture(state);
  assert.equal(activeShipSpeed(state), before);
});
