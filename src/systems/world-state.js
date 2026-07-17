import { FISH } from "../data.js";
import { REGIONS, SLEEPING_TIDE_BAY_ID, getFishHabitat, isRegionAvailable } from "../data/regions.js";
import { ROUTES, isRouteAvailable, routeById } from "../data/routes.js";
import { getRouteTravelDurationMs } from "./travel.js";

const isIsoDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value));
const uniqueStrings = values => [...new Set(Array.isArray(values) ? values.filter(value => typeof value === "string" && value) : [])];
const knownFishIds = new Set(FISH.map(fish => fish.id));

const availableRegionIds = () => REGIONS.filter(region => region.status === "available").map(region => region.id);
const availableRouteIds = () => ROUTES.filter(route => route.status === "available").map(route => route.id);
const defaultRouteIds = () => ROUTES.filter(route => route.status === "available" && route.unlock?.type === "default").map(route => route.id);
const validFishIds = values => uniqueStrings(values).filter(fishId => knownFishIds.has(fishId));

function regionProgressEntry(raw, fallbackDiscoveredFishIds = [], fallbackArrivedAt = null) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    discoveredFishIds: [...new Set([...validFishIds(source.discoveredFishIds), ...validFishIds(fallbackDiscoveredFishIds)])],
    completedResearchIds: uniqueStrings(source.completedResearchIds),
    firstArrivedAt: isIsoDate(source.firstArrivedAt)
      ? source.firstArrivedAt
      : isIsoDate(fallbackArrivedAt) ? fallbackArrivedAt : null
  };
}

export function createInitialWorldState({ discoveredFishIds = [], firstArrivedAt = null } = {}) {
  return {
    currentRegionId: SLEEPING_TIDE_BAY_ID,
    visitedRegionIds: [SLEEPING_TIDE_BAY_ID],
    unlockedRouteIds: defaultRouteIds(),
    completedRouteIds: [],
    regionProgress: {
      [SLEEPING_TIDE_BAY_ID]: regionProgressEntry(null, discoveredFishIds, firstArrivedAt)
    },
    travel: null,
    docking: { status: "docked", regionId: SLEEPING_TIDE_BAY_ID }
  };
}

export function createDeveloperWorldState({ discoveredFishIds = [], currentRegionId = SLEEPING_TIDE_BAY_ID } = {}) {
  const implementedRegionIds = availableRegionIds();
  const safeCurrentRegionId = implementedRegionIds.includes(currentRegionId) ? currentRegionId : SLEEPING_TIDE_BAY_ID;
  const regionProgress = Object.fromEntries(implementedRegionIds.map(regionId => [
    regionId,
    regionProgressEntry(null, regionId === SLEEPING_TIDE_BAY_ID ? discoveredFishIds : [])
  ]));
  return {
    currentRegionId: safeCurrentRegionId,
    visitedRegionIds: implementedRegionIds,
    unlockedRouteIds: availableRouteIds(),
    completedRouteIds: [],
    regionProgress,
    travel: null,
    docking: { status: "docked", regionId: safeCurrentRegionId }
  };
}

function normalizeTravel(raw, completedRouteIds = []) {
  if (!raw || typeof raw !== "object" || !isRouteAvailable(raw.routeId)) return null;
  const route = routeById(raw.routeId);
  const endpointsMatch = route
    && [route.fromRegionId, route.toRegionId].includes(raw.fromRegionId)
    && [route.fromRegionId, route.toRegionId].includes(raw.toRegionId)
    && raw.fromRegionId !== raw.toRegionId;
  if (!endpointsMatch || !isRegionAvailable(raw.fromRegionId) || !isRegionAvailable(raw.toRegionId)) return null;
  if (!isIsoDate(raw.startedAt) || !isIsoDate(raw.lastCheckedAt)) return null;
  const fallbackDurationMs = getRouteTravelDurationMs(route, { completedRouteIds });
  const durationMs = Math.min(7 * 24 * 60 * 60 * 1000, Math.max(1000, Number(raw.durationMs) || fallbackDurationMs));
  const elapsedMs = Math.min(durationMs, Math.max(0, Number(raw.elapsedMs) || 0));
  const totalSegments = Math.max(1, Math.floor(Number(route.travelSegments) || 1));
  const progress = elapsedMs / durationMs;
  return {
    routeId: route.id,
    fromRegionId: raw.fromRegionId,
    toRegionId: raw.toRegionId,
    segment: progress >= 1 ? totalSegments : Math.min(totalSegments, Math.floor(progress * totalSegments) + 1),
    startedAt: raw.startedAt,
    lastCheckedAt: raw.lastCheckedAt,
    durationMs,
    elapsedMs,
    observations: Array.isArray(raw.observations) ? raw.observations.filter(entry => entry && typeof entry === "object") : []
  };
}

export function normalizeWorldState(raw, {
  legacyDiscoveredFishIds = [],
  backfillLegacyDiscoveries = false,
  firstArrivedAt = null
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const implementedRegionIds = availableRegionIds();
  const safeCurrentRegionId = implementedRegionIds.includes(source.currentRegionId)
    ? source.currentRegionId
    : SLEEPING_TIDE_BAY_ID;
  const visitedRegionIds = [...new Set([
    SLEEPING_TIDE_BAY_ID,
    ...uniqueStrings(source.visitedRegionIds).filter(regionId => implementedRegionIds.includes(regionId)),
    safeCurrentRegionId
  ])];
  const unlockedRouteIds = [...new Set([
    ...defaultRouteIds(),
    ...uniqueStrings(source.unlockedRouteIds).filter(routeId => isRouteAvailable(routeId))
  ])];
  const completedRouteIds = uniqueStrings(source.completedRouteIds).filter(routeId => isRouteAvailable(routeId));
  const sourceProgress = source.regionProgress && typeof source.regionProgress === "object" ? source.regionProgress : {};
  const regionProgress = Object.fromEntries(visitedRegionIds.map(regionId => [
    regionId,
    regionProgressEntry(
      sourceProgress[regionId],
      backfillLegacyDiscoveries && regionId === SLEEPING_TIDE_BAY_ID ? legacyDiscoveredFishIds : [],
      regionId === SLEEPING_TIDE_BAY_ID ? firstArrivedAt : null
    )
  ]));
  const travel = normalizeTravel(source.travel, completedRouteIds);
  if (travel) {
    return {
      currentRegionId: safeCurrentRegionId,
      visitedRegionIds,
      unlockedRouteIds,
      completedRouteIds,
      regionProgress,
      travel,
      docking: { status: "traveling", regionId: null }
    };
  }

  const offshoreRegionId = source.docking?.status === "offshore" && implementedRegionIds.includes(source.docking.regionId)
    ? source.docking.regionId
    : null;
  return {
    currentRegionId: safeCurrentRegionId,
    visitedRegionIds,
    unlockedRouteIds,
    completedRouteIds,
    regionProgress,
    travel: null,
    docking: offshoreRegionId
      ? { status: "offshore", regionId: offshoreRegionId }
      : { status: "docked", regionId: safeCurrentRegionId }
  };
}

export function recordRegionalDiscovery(world, fishId, regionId = world?.currentRegionId) {
  if (!world || !knownFishIds.has(fishId) || !isRegionAvailable(regionId)) {
    return { world, isNewRegional: false };
  }
  const fish = FISH.find(entry => entry.id === fishId);
  if (!getFishHabitat(fish, regionId)) return { world, isNewRegional: false };
  const currentProgress = world.regionProgress?.[regionId] || regionProgressEntry();
  if (currentProgress.discoveredFishIds.includes(fishId)) return { world, isNewRegional: false };
  return {
    isNewRegional: true,
    world: {
      ...world,
      visitedRegionIds: [...new Set([...(world.visitedRegionIds || []), regionId])],
      regionProgress: {
        ...(world.regionProgress || {}),
        [regionId]: {
          ...currentProgress,
          discoveredFishIds: [...currentProgress.discoveredFishIds, fishId]
        }
      }
    }
  };
}

export function hasRegionalDiscovery(world, fishId, regionId) {
  return Boolean(world?.regionProgress?.[regionId]?.discoveredFishIds?.includes(fishId));
}
