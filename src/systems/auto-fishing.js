import {
  AUTO_FISHING_EQUIPMENT, AUTO_FISHING_POETIC_LINES, AUTO_FISHING_REASON_LABELS,
  BAITS, FISH, RARITY, getFishHabitat, getRegionFishingSpots, regionById, regionSpotById, shipById
} from "../data.js";

export const AUTO_FISHING_VERSION = 1;
export const AUTO_FISHING_SETTLED_LIMIT = 48;

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const strings = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [])];
const nonNegativeInt = value => Math.max(0, Math.floor(Number(value) || 0));
const discoveredCount = state => Object.keys(state?.discovered || {}).length;
const validSeed = value => typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : String(value ?? "").slice(0, 80);

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = stableHash(seed) || 1;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

function normalizeSession(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const configuredAt = safeDate(raw.configuredAt || raw.startedAt);
  return {
    id: raw.id,
    regionId: typeof raw.regionId === "string" ? raw.regionId : null,
    spotId: typeof raw.spotId === "string" ? raw.spotId : null,
    baitId: typeof raw.baitId === "string" ? raw.baitId : null,
    shipId: typeof raw.shipId === "string" ? raw.shipId : null,
    seed: validSeed(raw.seed) || String(stableHash(raw.id)),
    configuredAt,
    startedAt: safeDate(raw.startedAt) || configuredAt,
    closedAt: safeDate(raw.closedAt),
    lastResolvedAt: safeDate(raw.lastResolvedAt),
    status: "armed"
  };
}

function normalizeSummary(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  return {
    ...raw,
    id: raw.id,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : null,
    regionId: typeof raw.regionId === "string" ? raw.regionId : null,
    spotId: typeof raw.spotId === "string" ? raw.spotId : null,
    baitId: typeof raw.baitId === "string" ? raw.baitId : null,
    shipId: typeof raw.shipId === "string" ? raw.shipId : null,
    closedAt: safeDate(raw.closedAt),
    resolvedAt: safeDate(raw.resolvedAt),
    elapsedMs: nonNegativeInt(raw.elapsedMs),
    countedMs: nonNegativeInt(raw.countedMs),
    baitConsumed: nonNegativeInt(raw.baitConsumed),
    catchCount: nonNegativeInt(raw.catchCount),
    totalValue: nonNegativeInt(raw.totalValue),
    fishCounts: isObject(raw.fishCounts) ? Object.fromEntries(Object.entries(raw.fishCounts).filter(([id]) => FISH.some(fish => fish.id === id)).map(([id, count]) => [id, nonNegativeInt(count)])) : {},
    familiarityGainsByFishId: isObject(raw.familiarityGainsByFishId) ? Object.fromEntries(Object.entries(raw.familiarityGainsByFishId).filter(([id]) => FISH.some(fish => fish.id === id)).map(([id, count]) => [id, nonNegativeInt(count)])) : {},
    stopReason: typeof raw.stopReason === "string" ? raw.stopReason : "returned",
    sessionContinues: Boolean(raw.sessionContinues),
    poeticLine: typeof raw.poeticLine === "string" ? raw.poeticLine : "",
    acknowledged: Boolean(raw.acknowledged)
  };
}

export function createAutoFishingState() {
  return {
    version: AUTO_FISHING_VERSION,
    owned: false,
    purchasedAt: null,
    activeSession: null,
    lastSummary: null,
    settledSessionIds: []
  };
}

export function normalizeAutoFishingState(raw) {
  const source = isObject(raw) ? raw : {};
  return {
    version: AUTO_FISHING_VERSION,
    owned: Boolean(source.owned),
    purchasedAt: safeDate(source.purchasedAt),
    activeSession: normalizeSession(source.activeSession),
    lastSummary: normalizeSummary(source.lastSummary),
    settledSessionIds: strings(source.settledSessionIds).slice(-AUTO_FISHING_SETTLED_LIMIT)
  };
}

function dockedRegionId(state) {
  const docking = state?.world?.docking;
  return docking?.status === "docked" && docking.regionId === state.world?.currentRegionId ? docking.regionId : null;
}

export function getEligibleAutoFishingSpots(state) {
  const regionId = dockedRegionId(state);
  if (!regionId) return [];
  const visited = new Set(state.world?.regionProgress?.[regionId]?.caughtSpotIds || []);
  return getRegionFishingSpots(regionId).filter(spot => visited.has(spot.id)
    && (!spot.requires || state.ownedRods?.includes(spot.requires)));
}

export function getEligibleAutoFishingBaits(state) {
  const found = discoveredCount(state);
  return BAITS.filter(bait => (state?.baitAmounts?.[bait.id] || 0) > 0
    && (!bait.unlockDiscoveries || found >= bait.unlockDiscoveries));
}

export function getAutoFishingFishPool(state, { regionId, spotId, baitId }) {
  const bait = BAITS.find(item => item.id === baitId);
  if (!bait) return [];
  return FISH.filter(fish => ["common", "uncommon"].includes(fish.rarity)
      && state?.discovered?.[fish.id]
      && getFishHabitat(fish, regionId)?.spotIds.includes(spotId))
    .map(fish => {
      const habitat = getFishHabitat(fish, regionId);
      let weight = (fish.rarity === "common" ? 10 : 4.2) * Math.max(.1, Number(habitat?.baseWeight) || 1);
      if (fish.baits.includes(baitId)) weight *= 2.65;
      if (bait.tags.some(tag => fish.tags.includes(tag) || tag === fish.rarity || tag === spotId)) weight *= 1.45;
      if ((state.discovered[fish.id]?.count || 0) >= 4) weight *= .86;
      return { fish, weight };
    }).filter(entry => entry.weight > 0);
}

export function getAutoFishingPurchaseState(state) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (autoFishing.owned) return { ok: false, reason: "owned", equipment: AUTO_FISHING_EQUIPMENT };
  if (!state?.ships?.ownedShipIds?.includes(AUTO_FISHING_EQUIPMENT.unlockShipId)) return { ok: false, reason: "requires-ship", equipment: AUTO_FISHING_EQUIPMENT };
  if (!dockedRegionId(state)) return { ok: false, reason: "not-docked", equipment: AUTO_FISHING_EQUIPMENT };
  if ((Number(state?.money) || 0) < AUTO_FISHING_EQUIPMENT.price) return { ok: false, reason: "money", equipment: AUTO_FISHING_EQUIPMENT };
  return { ok: true, equipment: AUTO_FISHING_EQUIPMENT };
}

export function purchaseAutoFishingEquipment(state, purchasedAt = new Date().toISOString()) {
  const eligibility = getAutoFishingPurchaseState(state);
  if (!eligibility.ok) return eligibility;
  state.money -= AUTO_FISHING_EQUIPMENT.price;
  state.autoFishing = {
    ...normalizeAutoFishingState(state.autoFishing),
    owned: true,
    purchasedAt: safeDate(purchasedAt) || new Date().toISOString()
  };
  return { ok: true, equipment: AUTO_FISHING_EQUIPMENT };
}

export function startAutoFishingSession(state, { spotId, baitId, seed, configuredAt = new Date().toISOString() } = {}) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.owned) return { ok: false, reason: "not-owned" };
  const regionId = dockedRegionId(state);
  if (!regionId) return { ok: false, reason: "not-docked" };
  if (!getEligibleAutoFishingSpots(state).some(spot => spot.id === spotId)) return { ok: false, reason: "invalid-spot" };
  if (!getEligibleAutoFishingBaits(state).some(bait => bait.id === baitId)) return { ok: false, reason: "invalid-bait" };
  if (!getAutoFishingFishPool(state, { regionId, spotId, baitId }).length) return { ok: false, reason: "no-eligible-fish" };
  const at = safeDate(configuredAt) || new Date().toISOString();
  const normalizedSeed = validSeed(seed) || `${Date.parse(at)}:${state.gameEvents?.nextSequence || 1}:${spotId}:${baitId}`;
  const session = {
    id: `auto-session:${stableHash(`${normalizedSeed}:${at}:${spotId}:${baitId}`)}`,
    regionId,
    spotId,
    baitId,
    shipId: state.ships?.activeShipId || null,
    seed: normalizedSeed,
    configuredAt: at,
    startedAt: at,
    closedAt: null,
    lastResolvedAt: null,
    status: "armed"
  };
  state.autoFishing = { ...autoFishing, activeSession: session };
  return { ok: true, session };
}

export function stopAutoFishingSession(state, reason = "manual") {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.activeSession) return { ok: false, reason: "inactive" };
  const session = autoFishing.activeSession;
  state.autoFishing = { ...autoFishing, activeSession: null };
  return { ok: true, session, stopReason: reason, stopLabel: AUTO_FISHING_REASON_LABELS[reason] || AUTO_FISHING_REASON_LABELS.manual };
}

export function syncAutoFishingShip(state) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.activeSession || !state?.ships?.activeShipId) return false;
  state.autoFishing = { ...autoFishing, activeSession: { ...autoFishing.activeSession, shipId: state.ships.activeShipId } };
  return true;
}

export function markAutoFishingPageClosed(state, closedAt = new Date().toISOString()) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.owned || !autoFishing.activeSession || autoFishing.activeSession.closedAt) return false;
  const at = safeDate(closedAt);
  if (!at) return false;
  state.autoFishing = { ...autoFishing, activeSession: { ...autoFishing.activeSession, closedAt: at } };
  return true;
}

export function cancelAutoFishingCloseMarker(state) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.activeSession?.closedAt) return false;
  state.autoFishing = { ...autoFishing, activeSession: { ...autoFishing.activeSession, closedAt: null } };
  return true;
}

function pickWeighted(pool, random) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.fish;
  }
  return pool.at(-1)?.fish || null;
}

function autoCatch(fish, session, resolutionId, index, caughtAt, random, day) {
  const habitat = getFishHabitat(fish, session.regionId);
  const sizeScale = Math.max(.1, Number(habitat?.sizeScale) || 1);
  const ratio = .35 + random() * .35;
  const length = (fish.minLength + (fish.maxLength - fish.minLength) * ratio) * sizeScale;
  const minWeight = fish.minWeight * Math.pow(sizeScale, 3);
  const maxWeight = fish.maxWeight * Math.pow(sizeScale, 3);
  const weight = minWeight + (maxWeight - minWeight) * Math.pow(ratio, 1.65);
  return {
    uid: `auto:${stableHash(resolutionId)}:${index}:${fish.id}`,
    fishId: fish.id,
    length: Math.round(length * 10) / 10,
    weight: Math.round(weight * 100) / 100,
    sizeTier: "standard",
    variant: "normal",
    price: Math.round(fish.basePrice * RARITY[fish.rarity].multiplier),
    caughtAt,
    source: "auto",
    context: { regionId: session.regionId, spotId: session.spotId, timeId: null, weather: null, baitId: session.baitId, rodId: null, day }
  };
}

function summaryPoeticLine(reason, session, catchCount) {
  const key = catchCount ? reason : reason === "clock-rollback" ? reason : reason === "returned-early" ? reason : "empty";
  const pool = AUTO_FISHING_POETIC_LINES[key] || AUTO_FISHING_POETIC_LINES.stopped;
  return pool[stableHash(`${session.seed}:${session.closedAt}:${reason}`) % pool.length];
}

function applyAutoFamiliarity(state, fishId) {
  const record = state.discovered?.[fishId];
  if (!record) return false;
  const autoCount = nonNegativeInt(record.autoCount);
  if (autoCount >= AUTO_FISHING_EQUIPMENT.familiarityLimitPerFish) return false;
  const manualCount = Number.isFinite(Number(record.manualCount))
    ? nonNegativeInt(record.manualCount)
    : Math.max(0, nonNegativeInt(record.count) - autoCount);
  state.discovered[fishId] = {
    ...record,
    count: nonNegativeInt(record.count) + 1,
    manualCount,
    autoCount: autoCount + 1
  };
  return true;
}

export function settleAutoFishingOnOpen(state, openedAt = new Date().toISOString()) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  state.autoFishing = autoFishing;
  const session = autoFishing.activeSession;
  if (!session?.closedAt) return { ok: true, changed: false, summary: autoFishing.lastSummary?.acknowledged ? null : autoFishing.lastSummary };
  const at = safeDate(openedAt) || new Date().toISOString();
  const resolutionId = `auto-resolution:${session.id}:${session.closedAt}`;
  if (autoFishing.settledSessionIds.includes(resolutionId)) {
    state.autoFishing = { ...autoFishing, activeSession: { ...session, closedAt: null, lastResolvedAt: at } };
    return { ok: true, changed: true, duplicate: true, summary: autoFishing.lastSummary?.acknowledged ? null : autoFishing.lastSummary };
  }

  const elapsedRaw = Date.parse(at) - Date.parse(session.closedAt);
  const clockRollback = elapsedRaw < 0;
  const elapsedMs = Math.max(0, elapsedRaw);
  const countedMs = Math.min(elapsedMs, AUTO_FISHING_EQUIPMENT.maxOfflineMs);
  const stillDocked = dockedRegionId(state) === session.regionId;
  const spotStillValid = getEligibleAutoFishingSpots(state).some(spot => spot.id === session.spotId);
  const pool = stillDocked && spotStillValid ? getAutoFishingFishPool(state, session) : [];
  const availableBait = nonNegativeInt(state.baitAmounts?.[session.baitId]);
  const attempts = clockRollback ? 0 : Math.min(AUTO_FISHING_EQUIPMENT.maxCatchCount, Math.floor(countedMs / AUTO_FISHING_EQUIPMENT.catchIntervalMs));
  const catchCount = stillDocked && spotStillValid && pool.length ? Math.min(attempts, availableBait) : 0;
  const random = seededRandom(`${session.seed}:${session.closedAt}`);
  const fishCounts = {};
  const familiarityGainsByFishId = {};
  const catches = [];
  const knownCatchIds = new Set((state.catchInventory || []).map(caught => caught.uid));

  for (let index = 0; index < catchCount; index += 1) {
    const fish = pickWeighted(pool, random);
    if (!fish) break;
    const caughtTimestamp = Math.min(Date.parse(at), Date.parse(session.closedAt) + AUTO_FISHING_EQUIPMENT.catchIntervalMs * (index + 1));
    const caught = autoCatch(fish, session, resolutionId, index, new Date(caughtTimestamp).toISOString(), random, state.day);
    fishCounts[fish.id] = (fishCounts[fish.id] || 0) + 1;
    if (applyAutoFamiliarity(state, fish.id)) familiarityGainsByFishId[fish.id] = (familiarityGainsByFishId[fish.id] || 0) + 1;
    if (!knownCatchIds.has(caught.uid)) {
      knownCatchIds.add(caught.uid);
      catches.push(caught);
    }
  }

  state.catchInventory.push(...catches);
  state.baitAmounts[session.baitId] = Math.max(0, availableBait - catches.length);
  let stopReason = "returned";
  if (!stillDocked) stopReason = "region-changed";
  else if (!spotStillValid || !pool.length) stopReason = "no-eligible-fish";
  else if (clockRollback) stopReason = "clock-rollback";
  else if (!attempts) stopReason = "returned-early";
  else if (availableBait <= attempts) stopReason = "bait-empty";
  else if (elapsedMs >= AUTO_FISHING_EQUIPMENT.maxOfflineMs) stopReason = "three-hour-limit";
  const sessionContinues = ["returned", "returned-early", "clock-rollback"].includes(stopReason);
  const summary = {
    id: resolutionId,
    sessionId: session.id,
    regionId: session.regionId,
    spotId: session.spotId,
    baitId: session.baitId,
    shipId: session.shipId,
    closedAt: session.closedAt,
    resolvedAt: at,
    elapsedMs,
    countedMs,
    baitConsumed: catches.length,
    catchCount: catches.length,
    totalValue: catches.reduce((sum, caught) => sum + caught.price, 0),
    fishCounts,
    familiarityGainsByFishId,
    stopReason,
    sessionContinues,
    poeticLine: summaryPoeticLine(stopReason, session, catches.length),
    acknowledged: false
  };
  const nextSession = sessionContinues ? { ...session, closedAt: null, lastResolvedAt: at } : null;
  state.autoFishing = {
    ...autoFishing,
    activeSession: nextSession,
    lastSummary: summary,
    settledSessionIds: [...new Set([...autoFishing.settledSessionIds, resolutionId])].slice(-AUTO_FISHING_SETTLED_LIMIT)
  };
  return { ok: true, changed: true, summary, catches };
}

export function acknowledgeAutoFishingSummary(state, summaryId = null) {
  const autoFishing = normalizeAutoFishingState(state?.autoFishing);
  if (!autoFishing.lastSummary || (summaryId && autoFishing.lastSummary.id !== summaryId)) return false;
  state.autoFishing = { ...autoFishing, lastSummary: { ...autoFishing.lastSummary, acknowledged: true } };
  return true;
}

export function autoFishingSummaryView(summary) {
  const normalized = normalizeSummary(summary);
  if (!normalized) return null;
  return {
    ...normalized,
    region: regionById(normalized.regionId),
    spot: regionSpotById(normalized.spotId),
    bait: BAITS.find(item => item.id === normalized.baitId) || null,
    ship: shipById(normalized.shipId),
    stopLabel: AUTO_FISHING_REASON_LABELS[normalized.stopReason] || normalized.stopReason,
    fish: Object.entries(normalized.fishCounts).map(([fishId, count]) => ({ fish: FISH.find(item => item.id === fishId), count })).filter(entry => entry.fish)
  };
}

export function resetAutoFishingForDeveloper(state, { owned = true } = {}) {
  if (!state?.developerMode) return false;
  state.autoFishing = { ...createAutoFishingState(), owned, purchasedAt: owned ? new Date().toISOString() : null };
  return true;
}
