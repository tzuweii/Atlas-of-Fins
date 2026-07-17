import { getRouteDestination, isRouteAvailable, routeById } from "../data/routes.js";

export const CHART_VIEW_LIMITS = Object.freeze({
  minZoom: 0.8,
  maxZoom: 1.6,
  zoomStep: 0.2,
  panLimit: 18,
  panStep: 4
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rounded = value => Math.round(value * 100) / 100;
const finiteNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function createDefaultChartView() {
  return { zoom: 1, x: 0, y: 0 };
}

export function normalizeChartView(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    zoom: rounded(clamp(finiteNumber(source.zoom, 1), CHART_VIEW_LIMITS.minZoom, CHART_VIEW_LIMITS.maxZoom)),
    x: rounded(clamp(finiteNumber(source.x, 0), -CHART_VIEW_LIMITS.panLimit, CHART_VIEW_LIMITS.panLimit)),
    y: rounded(clamp(finiteNumber(source.y, 0), -CHART_VIEW_LIMITS.panLimit, CHART_VIEW_LIMITS.panLimit))
  };
}

export function zoomChartView(view, direction) {
  const current = normalizeChartView(view);
  const delta = Math.sign(Number(direction) || 0) * CHART_VIEW_LIMITS.zoomStep;
  return normalizeChartView({ ...current, zoom: current.zoom + delta });
}

export function panChartView(view, deltaX, deltaY) {
  const current = normalizeChartView(view);
  return normalizeChartView({
    ...current,
    x: current.x + (Number(deltaX) || 0),
    y: current.y + (Number(deltaY) || 0)
  });
}

export function canBeginChartRoute(world, routeId) {
  const route = routeById(routeId);
  if (!route || !isRouteAvailable(routeId)) return { ok: false, reason: "route-unavailable", route };
  if (!world?.unlockedRouteIds?.includes(routeId)) return { ok: false, reason: "route-locked", route };
  if (world.travel || world.docking?.status !== "docked") return { ok: false, reason: "not-docked", route };
  const destinationId = getRouteDestination(route, world.currentRegionId);
  if (!destinationId) return { ok: false, reason: "wrong-region", route };
  return { ok: true, route, destinationId };
}

export function requestChartRoute(world, routeId) {
  const availability = canBeginChartRoute(world, routeId);
  return availability.ok
    ? { ...availability, ok: false, reason: "travel-not-implemented", world }
    : { ...availability, world };
}
