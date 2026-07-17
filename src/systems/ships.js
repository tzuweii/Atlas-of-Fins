import { IMPLEMENTED_SHIP_IDS, SHIPS, shipById } from "../data/ships.js";

export const SHIP_CATALOG_VERSION = 1;
export const STARTER_SHIP_ID = "drifting_home";

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const uniqueKnownShipIds = values => [...new Set(Array.isArray(values) ? values.filter(id => shipById(id)) : [])];
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

export function createShipsState(starterInterior = {}) {
  return {
    catalogVersion: SHIP_CATALOG_VERSION,
    activeShipId: STARTER_SHIP_ID,
    ownedShipIds: [STARTER_SHIP_ID],
    purchasedAtByShipId: {},
    revealedShipIds: [STARTER_SHIP_ID],
    interiorsByShipId: { [STARTER_SHIP_ID]: starterInterior }
  };
}

export function normalizeShipsState(raw, { starterInterior = {} } = {}) {
  const source = isObject(raw) ? raw : {};
  const ownedShipIds = uniqueKnownShipIds(source.ownedShipIds);
  if (!ownedShipIds.includes(STARTER_SHIP_ID)) ownedShipIds.unshift(STARTER_SHIP_ID);
  const revealedShipIds = uniqueKnownShipIds(source.revealedShipIds);
  if (!revealedShipIds.includes(STARTER_SHIP_ID)) revealedShipIds.unshift(STARTER_SHIP_ID);
  const activeShipId = ownedShipIds.includes(source.activeShipId) ? source.activeShipId : STARTER_SHIP_ID;
  const purchasedAtByShipId = Object.fromEntries(Object.entries(isObject(source.purchasedAtByShipId) ? source.purchasedAtByShipId : {})
    .filter(([shipId, value]) => ownedShipIds.includes(shipId) && shipId !== STARTER_SHIP_ID && safeDate(value)));
  const interiors = isObject(source.interiorsByShipId) ? source.interiorsByShipId : {};
  const normalized = {
    catalogVersion: SHIP_CATALOG_VERSION,
    activeShipId,
    ownedShipIds,
    purchasedAtByShipId,
    revealedShipIds,
    interiorsByShipId: {
      ...interiors,
      [STARTER_SHIP_ID]: isObject(interiors[STARTER_SHIP_ID]) ? interiors[STARTER_SHIP_ID] : starterInterior
    }
  };
  const developerSpeedMultiplier = Number(source.developerSpeedMultiplier);
  if (Number.isFinite(developerSpeedMultiplier)) normalized.developerSpeedMultiplier = Math.min(2, Math.max(.5, developerSpeedMultiplier));
  return normalized;
}

export function activeShip(state) {
  return shipById(state?.ships?.activeShipId) || shipById(STARTER_SHIP_ID);
}

export function activeShipSpeed(state) {
  const formalSpeed = activeShip(state)?.speedMultiplier || 1;
  const override = state?.developerMode ? Number(state?.ships?.developerSpeedMultiplier) : NaN;
  return Number.isFinite(override) ? Math.min(2, Math.max(.5, override)) : formalSpeed;
}

export function revealEligibleShips(state) {
  const current = normalizeShipsState(state.ships);
  const total = Math.max(0, Number(state?.tideglow?.total) || 0);
  const newlyRevealed = SHIPS.filter(ship => total >= ship.tideglowRequired && !current.revealedShipIds.includes(ship.id));
  state.ships = { ...current, revealedShipIds: [...current.revealedShipIds, ...newlyRevealed.map(ship => ship.id)] };
  return newlyRevealed;
}

export function canUseShipStore(state) {
  return Boolean(state?.world?.docking?.status === "docked"
    && state.world.docking.regionId === state.world.currentRegionId);
}

export function getShipPurchaseState(state, shipId) {
  const ship = shipById(shipId);
  if (!ship) return { ok: false, reason: "missing-ship", ship: null };
  if (state?.ships?.ownedShipIds?.includes(ship.id)) return { ok: false, reason: "owned", ship };
  if (ship.status !== "implemented") return { ok: false, reason: "preview", ship };
  if (!canUseShipStore(state)) return { ok: false, reason: "not-docked", ship };
  if ((state?.tideglow?.total || 0) < ship.tideglowRequired) return { ok: false, reason: "tideglow", ship };
  if ((state?.money || 0) < ship.price) return { ok: false, reason: "money", ship };
  return { ok: true, ship };
}

export function purchaseShip(state, shipId, purchasedAt = new Date().toISOString()) {
  const eligibility = getShipPurchaseState(state, shipId);
  if (!eligibility.ok) return eligibility;
  const ship = eligibility.ship;
  state.money -= ship.price;
  state.ships = normalizeShipsState({
    ...state.ships,
    activeShipId: ship.id,
    ownedShipIds: [...state.ships.ownedShipIds, ship.id],
    revealedShipIds: [...state.ships.revealedShipIds, ship.id],
    purchasedAtByShipId: { ...state.ships.purchasedAtByShipId, [ship.id]: safeDate(purchasedAt) || new Date().toISOString() },
    interiorsByShipId: { ...state.ships.interiorsByShipId, [ship.id]: {} }
  });
  return { ok: true, ship, activeShipId: ship.id };
}

export function switchShip(state, shipId) {
  const ship = shipById(shipId);
  if (!ship) return { ok: false, reason: "missing-ship" };
  if (!canUseShipStore(state)) return { ok: false, reason: "not-docked", ship };
  if (!state?.ships?.ownedShipIds?.includes(ship.id)) return { ok: false, reason: "not-owned", ship };
  if (state.ships.activeShipId === ship.id) return { ok: true, unchanged: true, ship };
  state.ships = { ...state.ships, activeShipId: ship.id };
  return { ok: true, ship, activeShipId: ship.id };
}

export function developerSetShipOwned(state, shipId, owned = true) {
  const ship = shipById(shipId);
  if (!state?.developerMode || !ship || ship.status !== "implemented" || ship.id === STARTER_SHIP_ID) return false;
  const ownedShipIds = owned
    ? [...new Set([...state.ships.ownedShipIds, ship.id])]
    : state.ships.ownedShipIds.filter(id => id !== ship.id);
  state.ships = normalizeShipsState({
    ...state.ships,
    activeShipId: ownedShipIds.includes(state.ships.activeShipId) ? state.ships.activeShipId : STARTER_SHIP_ID,
    ownedShipIds,
    revealedShipIds: [...new Set([...state.ships.revealedShipIds, ship.id])],
    purchasedAtByShipId: owned ? { ...state.ships.purchasedAtByShipId, [ship.id]: new Date().toISOString() } : Object.fromEntries(Object.entries(state.ships.purchasedAtByShipId).filter(([id]) => id !== ship.id))
  });
  return true;
}

export function developerRevealAllShips(state) {
  if (!state?.developerMode) return false;
  state.ships = { ...state.ships, revealedShipIds: SHIPS.map(ship => ship.id) };
  return true;
}

export function developerSetShipSpeed(state, speedMultiplier) {
  if (!state?.developerMode || !Number.isFinite(Number(speedMultiplier))) return false;
  state.ships = { ...state.ships, developerSpeedMultiplier: Math.min(2, Math.max(.5, Number(speedMultiplier))) };
  return true;
}

export { IMPLEMENTED_SHIP_IDS };
