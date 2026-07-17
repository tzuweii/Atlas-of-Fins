import { LUMINOUS_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID } from "./regions.js";
import { SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID } from "./routes.js";

export const CHART_LAYOUT = Object.freeze({
  id: "world-chart-v1",
  width: 100,
  height: 100,
  visualMode: "programmatic-css",
  artStatus: "deferred"
});

export const CHART_REGION_POINTS = Object.freeze([
  Object.freeze({
    id: SLEEPING_TIDE_BAY_ID,
    regionId: SLEEPING_TIDE_BAY_ID,
    x: 27,
    y: 66,
    marker: "harbor",
    note: "目前可停泊的家港"
  }),
  Object.freeze({
    id: LUMINOUS_ARCHIPELAGO_ID,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    x: 75,
    y: 35,
    marker: "mist",
    note: "海圖仍覆著測繪迷霧"
  })
]);

export const CHART_ROUTE_PATHS = Object.freeze([
  Object.freeze({
    id: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    routeId: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    controlX: 50,
    controlY: 45,
    note: "相鄰暖流航線預告"
  })
]);

export function chartRegionPointById(regionId) {
  return CHART_REGION_POINTS.find(point => point.regionId === regionId) || null;
}

export function chartRoutePathById(routeId) {
  return CHART_ROUTE_PATHS.find(path => path.routeId === routeId) || null;
}
