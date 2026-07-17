import { isRegionAvailable } from "../data/regions.js";
import { getRouteDestination, isRouteAvailable, routeById } from "../data/routes.js";

export const FIRST_TRAVEL_DURATION_MS = Object.freeze({
  short: 6 * 60 * 1000,
  medium: 12 * 60 * 1000,
  long: 24 * 60 * 1000
});

export const FAMILIAR_TRAVEL_DURATION_MS = 3 * 60 * 1000;
export const DEVELOPER_TRAVEL_SCALES = Object.freeze([1, 0.1, 0.01]);

const uniqueStrings = values => [...new Set(Array.isArray(values) ? values.filter(value => typeof value === "string" && value) : [])];
const validDateMs = value => {
  const parsed = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const isoAt = value => new Date(value).toISOString();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeTravelScale(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, 0.01, 1) : 1;
}

export function getRouteTravelDurationMs(route, world, scale = 1) {
  if (!route) return 0;
  const familiar = world?.completedRouteIds?.includes(route.id);
  const base = familiar
    ? FAMILIAR_TRAVEL_DURATION_MS
    : FIRST_TRAVEL_DURATION_MS[route.distanceClass] || FIRST_TRAVEL_DURATION_MS.medium;
  return Math.max(1000, Math.round(base * normalizeTravelScale(scale)));
}

export function canBeginWorldTravel(world, routeId) {
  const route = routeById(routeId);
  if (!route || !isRouteAvailable(routeId)) return { ok: false, reason: "route-unavailable", route };
  if (!world?.unlockedRouteIds?.includes(routeId)) return { ok: false, reason: "route-locked", route };
  if (world.travel || world.docking?.status !== "docked") return { ok: false, reason: "not-docked", route };
  if (world.docking.regionId !== world.currentRegionId) return { ok: false, reason: "invalid-dock", route };
  const destinationId = getRouteDestination(route, world.currentRegionId);
  if (!destinationId) return { ok: false, reason: "wrong-region", route };
  if (!isRegionAvailable(destinationId)) return { ok: false, reason: "destination-unavailable", route };
  return { ok: true, route, destinationId };
}

export function beginWorldTravel(world, routeId, now = Date.now(), { scale = 1 } = {}) {
  const availability = canBeginWorldTravel(world, routeId);
  if (!availability.ok) return { ...availability, world };
  const nowMs = validDateMs(now);
  if (nowMs === null) return { ...availability, ok: false, reason: "invalid-time", world };
  const durationMs = getRouteTravelDurationMs(availability.route, world, scale);
  const travel = {
    routeId: availability.route.id,
    fromRegionId: world.currentRegionId,
    toRegionId: availability.destinationId,
    segment: 1,
    startedAt: isoAt(nowMs),
    lastCheckedAt: isoAt(nowMs),
    durationMs,
    elapsedMs: 0,
    observations: []
  };
  return {
    ...availability,
    durationMs,
    world: { ...world, travel, docking: { status: "traveling", regionId: null } }
  };
}

export function getTravelStatus(world) {
  const travel = world?.travel;
  if (!travel) return null;
  const route = routeById(travel.routeId);
  if (!route) return null;
  const durationMs = Math.max(1000, Number(travel.durationMs) || 1000);
  const elapsedMs = clamp(Number(travel.elapsedMs) || 0, 0, durationMs);
  const progress = elapsedMs / durationMs;
  const totalSegments = Math.max(1, Math.floor(Number(route.travelSegments) || 1));
  const segment = progress >= 1 ? totalSegments : Math.min(totalSegments, Math.floor(progress * totalSegments) + 1);
  return {
    route,
    travel,
    durationMs,
    elapsedMs,
    remainingMs: Math.max(0, durationMs - elapsedMs),
    progress,
    segment,
    totalSegments,
    familiar: world.completedRouteIds?.includes(route.id) || false
  };
}

export function advanceWorldTravel(world, now = Date.now()) {
  const status = getTravelStatus(world);
  if (!status) return { ok: false, reason: "not-traveling", world, changed: false, arrived: false };
  const lastCheckedMs = validDateMs(status.travel.lastCheckedAt);
  const nowMs = validDateMs(now);
  if (lastCheckedMs === null || nowMs === null) return { ok: false, reason: "invalid-time", world, changed: false, arrived: false };
  const elapsedMs = Math.min(status.durationMs, status.elapsedMs + Math.max(0, nowMs - lastCheckedMs));
  const nextStatus = getTravelStatus({
    ...world,
    travel: { ...status.travel, elapsedMs }
  });
  if (elapsedMs >= status.durationMs) {
    return {
      ok: true,
      changed: true,
      arrived: true,
      destinationId: status.travel.toRegionId,
      route: status.route,
      world: {
        ...world,
        completedRouteIds: uniqueStrings([...(world.completedRouteIds || []), status.route.id]),
        travel: null,
        docking: { status: "offshore", regionId: status.travel.toRegionId }
      }
    };
  }
  const checkedAt = isoAt(nowMs);
  const nextTravel = {
    ...status.travel,
    segment: nextStatus.segment,
    elapsedMs,
    lastCheckedAt: checkedAt
  };
  return {
    ok: true,
    changed: elapsedMs !== status.elapsedMs || checkedAt !== status.travel.lastCheckedAt,
    arrived: false,
    route: status.route,
    status: nextStatus,
    world: { ...world, travel: nextTravel, docking: { status: "traveling", regionId: null } }
  };
}

export function dockWorldAtDestination(world, now = Date.now()) {
  const destinationId = world?.docking?.status === "offshore" ? world.docking.regionId : null;
  const nowMs = validDateMs(now);
  if (!destinationId || !isRegionAvailable(destinationId)) return { ok: false, reason: "not-offshore", world };
  if (nowMs === null) return { ok: false, reason: "invalid-time", world };
  const previousProgress = world.regionProgress?.[destinationId];
  const regionProgress = {
    discoveredFishIds: uniqueStrings(previousProgress?.discoveredFishIds),
    completedResearchIds: uniqueStrings(previousProgress?.completedResearchIds),
    firstArrivedAt: validDateMs(previousProgress?.firstArrivedAt) === null
      ? isoAt(nowMs)
      : previousProgress.firstArrivedAt
  };
  return {
    ok: true,
    destinationId,
    firstArrival: !world.visitedRegionIds?.includes(destinationId),
    world: {
      ...world,
      currentRegionId: destinationId,
      visitedRegionIds: uniqueStrings([...(world.visitedRegionIds || []), destinationId]),
      regionProgress: { ...(world.regionProgress || {}), [destinationId]: regionProgress },
      travel: null,
      docking: { status: "docked", regionId: destinationId }
    }
  };
}
