import { LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID } from "./regions.js";

export const SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID = "sleeping_tide_to_luminous_archipelago";

export const ROUTES = [
  {
    id: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    fromRegionId: SLEEPING_TIDE_BAY_ID,
    toRegionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光暖流航線",
    currentTags: ["warm_current"],
    unlock: { type: "future-slice" },
    travelSegments: 3,
    preview: {
      color: "coral_blue",
      silhouetteFishIds: [],
      musicPreviewId: null
    },
    status: "preview"
  }
];

export function routeById(routeId) {
  return ROUTES.find(route => route.id === routeId);
}

export function getRoutesForRegion(regionId, { includePreview = false } = {}) {
  return ROUTES.filter(route => {
    const connected = route.fromRegionId === regionId || route.toRegionId === regionId;
    return connected && (includePreview || route.status === "available");
  });
}

export function getRouteDestination(route, currentRegionId) {
  if (!route) return null;
  if (route.fromRegionId === currentRegionId) return route.toRegionId;
  if (route.toRegionId === currentRegionId) return route.fromRegionId;
  return null;
}

export function isRouteAvailable(routeId) {
  return routeById(routeId)?.status === "available";
}
