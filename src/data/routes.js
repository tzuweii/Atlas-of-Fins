import {
  GRAYCROWN_STONE_COAST_ID, LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID,
  MONSOON_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID
} from "./regions.js";

export const SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID = "sleeping_tide_to_luminous_archipelago";
export const LUMINOUS_TO_MIST_CAPE_ROUTE_ID = "luminous_archipelago_to_mist_cape";
export const MIST_CAPE_TO_MONSOON_ROUTE_ID = "mist_cape_to_monsoon_archipelago";
export const MONSOON_TO_GRAYCROWN_ROUTE_ID = "monsoon_archipelago_to_graycrown_stone_coast";

export const ROUTES = [
  {
    id: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    fromRegionId: SLEEPING_TIDE_BAY_ID,
    toRegionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光暖流航線",
    currentTags: ["warm_current"],
    unlock: { type: "resident-story", sceneId: "keeper_outer_current_chart" },
    distanceClass: "short",
    travelSegments: 3,
    preview: {
      color: "coral_blue",
      silhouetteFishIds: [],
      musicPreviewId: null
    },
    status: "available"
  },
  {
    id: LUMINOUS_TO_MIST_CAPE_ROUTE_ID,
    fromRegionId: LUMINOUS_ARCHIPELAGO_ID,
    toRegionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧岬潮界航線",
    currentTags: ["warm_current", "cold_current", "thermal_front"],
    unlock: { type: "resident-story", sceneId: "chengye_current_map" },
    distanceClass: "medium",
    travelSegments: 4,
    preview: {
      color: "mist_teal",
      silhouetteFishIds: ["basking_shark"],
      musicPreviewId: "mistbell_strings"
    },
    status: "available"
  },
  {
    id: MIST_CAPE_TO_MONSOON_ROUTE_ID,
    fromRegionId: MIST_CAPE_COLD_CURRENT_ID,
    toRegionId: MONSOON_ARCHIPELAGO_ID,
    name: "長風寒舌航線",
    currentTags: ["cold_current", "long_wind", "monsoon_swell"],
    unlock: { type: "resident-story", sceneId: "wuhe_seasonal_section" },
    distanceClass: "medium",
    travelSegments: 4,
    preview: {
      color: "monsoon_jade",
      silhouetteFishIds: ["narrow_barred_spanish_mackerel"],
      musicPreviewId: "windstone_reeds"
    },
    status: "available"
  },
  {
    id: MONSOON_TO_GRAYCROWN_ROUTE_ID,
    fromRegionId: MONSOON_ARCHIPELAGO_ID,
    toRegionId: GRAYCROWN_STONE_COAST_ID,
    name: "灰冠長浪航線",
    currentTags: ["long_swell", "wind_worn_stone", "stone_coast"],
    unlock: { type: "resident-story", sceneId: "jicen_windstone_route_rubbing" },
    distanceClass: "medium",
    travelSegments: 4,
    preview: {
      color: "graycrown_slate",
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
