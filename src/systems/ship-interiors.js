import {
  SHIP_LIGHTING, SHIP_SLOT_TYPES, getShipFurniture, shipFurnitureById, shipInteriorSceneByShipId
} from "../data/ship-interiors.js";

export const SHIP_INTERIOR_VERSION = 1;

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const emptySlots = () => Object.fromEntries(SHIP_SLOT_TYPES.map(slot => [slot.id, null]));
const knownLightingIds = new Set(SHIP_LIGHTING.map(option => option.id));

export function createShipInteriorState(shipId, seed = {}) {
  const scene = shipInteriorSceneByShipId(shipId);
  const starterOwned = shipId === "drifting_home" ? ["sleeping_bag"] : [];
  const starterPlaced = shipId === "drifting_home" ? { sleep: "sleeping_bag" } : {};
  return normalizeShipInteriorState(shipId, {
    ownedFurnitureIds: seed.ownedFurnitureIds ?? starterOwned,
    placedFurniture: { ...starterPlaced, ...(seed.placedFurniture || {}) },
    lightingId: seed.lightingId || "default",
    aquariumFrameId: scene?.aquariumFrameId || "default"
  });
}

export function normalizeShipInteriorState(shipId, raw = {}) {
  const source = isObject(raw) ? raw : {};
  const catalogIds = new Set(getShipFurniture(shipId).map(item => item.id));
  const ownedFurnitureIds = [...new Set(Array.isArray(source.ownedFurnitureIds)
    ? source.ownedFurnitureIds.filter(id => catalogIds.has(id))
    : [])];
  const owned = new Set(ownedFurnitureIds);
  const placedFurniture = emptySlots();
  for (const slot of SHIP_SLOT_TYPES) {
    const furnitureId = source.placedFurniture?.[slot.id];
    const item = shipFurnitureById(furnitureId);
    if (item?.shipId === shipId && item.slot === slot.id && owned.has(item.id)) placedFurniture[slot.id] = item.id;
  }
  const lightingId = knownLightingIds.has(source.lightingId) ? source.lightingId : "default";
  return {
    ownedFurnitureIds,
    placedFurniture,
    lightingId,
    aquariumFrameId: shipInteriorSceneByShipId(shipId)?.aquariumFrameId || "default"
  };
}

export function normalizeShipInteriors(interiorsByShipId, ownedShipIds = []) {
  const source = isObject(interiorsByShipId) ? interiorsByShipId : {};
  return Object.fromEntries(ownedShipIds.map(shipId => [
    shipId,
    source[shipId] ? normalizeShipInteriorState(shipId, source[shipId]) : createShipInteriorState(shipId)
  ]));
}

export function shipInterior(state, shipId = state?.ships?.activeShipId) {
  if (!shipId || !state?.ships?.ownedShipIds?.includes(shipId)) return null;
  const current = state.ships.interiorsByShipId?.[shipId];
  return current ? normalizeShipInteriorState(shipId, current) : createShipInteriorState(shipId);
}

export function activeShipFurnitureCatalog(state) {
  return getShipFurniture(state?.ships?.activeShipId);
}

export function canEditActiveShipInterior(state) {
  const shipId = state?.ships?.activeShipId;
  return Boolean(shipId
    && state?.ships?.ownedShipIds?.includes(shipId)
    && state?.world?.docking?.status === "docked"
    && state.world.docking.regionId === state.world.currentRegionId);
}

export function purchaseShipFurniture(state, furnitureId) {
  const item = shipFurnitureById(furnitureId);
  const shipId = state?.ships?.activeShipId;
  if (!item) return { ok: false, reason: "missing-furniture" };
  if (item.shipId !== shipId) return { ok: false, reason: "wrong-ship", item };
  if (!canEditActiveShipInterior(state)) return { ok: false, reason: "not-docked", item };
  const interior = shipInterior(state, shipId);
  if (interior.ownedFurnitureIds.includes(item.id)) return { ok: false, reason: "owned", item };
  if (item.milestone) return { ok: false, reason: "milestone", item };
  if (item.unlockDiscoveries && Object.keys(state.discovered || {}).length < item.unlockDiscoveries) return { ok: false, reason: "locked", item };
  if ((Number(state.money) || 0) < item.price) return { ok: false, reason: "money", item };
  state.money -= item.price;
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...interior,
    ownedFurnitureIds: [...interior.ownedFurnitureIds, item.id],
    placedFurniture: { ...interior.placedFurniture, [item.slot]: item.id }
  });
  syncLegacyStarterFurniture(state);
  return { ok: true, item, shipId, interior: state.ships.interiorsByShipId[shipId] };
}

export function placeShipFurniture(state, furnitureId) {
  const item = shipFurnitureById(furnitureId);
  const shipId = state?.ships?.activeShipId;
  const interior = shipInterior(state, shipId);
  if (!item || !interior || item.shipId !== shipId) return { ok: false, reason: "wrong-ship" };
  if (!interior.ownedFurnitureIds.includes(item.id)) return { ok: false, reason: "not-owned", item };
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...interior,
    placedFurniture: { ...interior.placedFurniture, [item.slot]: item.id }
  });
  syncLegacyStarterFurniture(state);
  return { ok: true, item, shipId };
}

export function grantShipFurniture(state, furnitureId, { place = false } = {}) {
  const item = shipFurnitureById(furnitureId);
  if (!item || !state?.ships?.ownedShipIds?.includes(item.shipId)) return false;
  const interior = shipInterior(state, item.shipId);
  state.ships.interiorsByShipId[item.shipId] = normalizeShipInteriorState(item.shipId, {
    ...interior,
    ownedFurnitureIds: [...interior.ownedFurnitureIds, item.id],
    placedFurniture: place ? { ...interior.placedFurniture, [item.slot]: item.id } : interior.placedFurniture
  });
  syncLegacyStarterFurniture(state);
  return true;
}

export function syncLegacyStarterFurniture(state) {
  const starter = state?.ships?.interiorsByShipId?.drifting_home;
  if (!starter) return state;
  state.ownedFurniture = [...starter.ownedFurnitureIds];
  state.placedFurniture = { ...starter.placedFurniture };
  return state;
}

export function collectInvalidInteriorReferences(state) {
  const problems = [];
  for (const [shipId, raw] of Object.entries(state?.ships?.interiorsByShipId || {})) {
    if (!state.ships.ownedShipIds.includes(shipId)) problems.push({ shipId, path: "interior", reason: "unowned-ship" });
    const owned = new Set(Array.isArray(raw?.ownedFurnitureIds) ? raw.ownedFurnitureIds : []);
    for (const furnitureId of owned) {
      const item = shipFurnitureById(furnitureId);
      if (!item) problems.push({ shipId, path: `owned:${furnitureId}`, reason: "missing-furniture" });
      else if (item.shipId !== shipId) problems.push({ shipId, path: `owned:${furnitureId}`, reason: "wrong-ship" });
    }
    for (const slot of SHIP_SLOT_TYPES) {
      const furnitureId = raw?.placedFurniture?.[slot.id];
      if (furnitureId == null) continue;
      const item = shipFurnitureById(furnitureId);
      if (!item) problems.push({ shipId, path: `placed:${slot.id}`, reason: "missing-furniture" });
      else if (item.shipId !== shipId) problems.push({ shipId, path: `placed:${slot.id}`, reason: "wrong-ship" });
      else if (item.slot !== slot.id) problems.push({ shipId, path: `placed:${slot.id}`, reason: "wrong-slot" });
      else if (!owned.has(item.id)) problems.push({ shipId, path: `placed:${slot.id}`, reason: "not-owned" });
    }
    if (!knownLightingIds.has(raw?.lightingId)) problems.push({ shipId, path: "lightingId", reason: "invalid-lighting" });
    if (raw?.aquariumFrameId !== shipInteriorSceneByShipId(shipId)?.aquariumFrameId) problems.push({ shipId, path: "aquariumFrameId", reason: "invalid-frame" });
  }
  return problems;
}

export function developerFillShipFurniture(state, shipId = state?.ships?.activeShipId) {
  if (!state?.developerMode || !state?.ships?.ownedShipIds?.includes(shipId)) return false;
  const catalog = getShipFurniture(shipId);
  const placedFurniture = Object.fromEntries(SHIP_SLOT_TYPES.map(slot => [
    slot.id,
    catalog.findLast(item => item.slot === slot.id)?.id || null
  ]));
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...shipInterior(state, shipId),
    ownedFurnitureIds: catalog.map(item => item.id),
    placedFurniture
  });
  syncLegacyStarterFurniture(state);
  return true;
}

export function developerClearShipFurniture(state, shipId = state?.ships?.activeShipId) {
  if (!state?.developerMode || !state?.ships?.ownedShipIds?.includes(shipId)) return false;
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...shipInterior(state, shipId),
    ownedFurnitureIds: [],
    placedFurniture: emptySlots()
  });
  syncLegacyStarterFurniture(state);
  return true;
}

export function developerResetShipSlots(state, shipId = state?.ships?.activeShipId) {
  if (!state?.developerMode || !state?.ships?.ownedShipIds?.includes(shipId)) return false;
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...shipInterior(state, shipId),
    placedFurniture: emptySlots()
  });
  syncLegacyStarterFurniture(state);
  return true;
}

export function developerSetShipLighting(state, lightingId, shipId = state?.ships?.activeShipId) {
  if (!state?.developerMode || !knownLightingIds.has(lightingId) || !state?.ships?.ownedShipIds?.includes(shipId)) return false;
  state.ships.interiorsByShipId[shipId] = normalizeShipInteriorState(shipId, {
    ...shipInterior(state, shipId),
    lightingId
  });
  return true;
}
