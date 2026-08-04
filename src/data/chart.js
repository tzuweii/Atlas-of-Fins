import {
  GRAYCROWN_STONE_COAST_ID, LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID,
  MONSOON_ARCHIPELAGO_ID, SLEEPING_TIDE_BAY_ID
} from "./regions.js";
import {
  LUMINOUS_TO_MIST_CAPE_ROUTE_ID, MIST_CAPE_TO_MONSOON_ROUTE_ID,
  MONSOON_TO_GRAYCROWN_ROUTE_ID, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "./routes.js";

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
    x: 30,
    y: 78,
    marker: "harbor",
    note: "目前可停泊的家港"
  }),
  Object.freeze({
    id: LUMINOUS_ARCHIPELAGO_ID,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    x: 76,
    y: 55,
    marker: "mist",
    note: "海圖仍覆著測繪迷霧"
  }),
  Object.freeze({
    id: MIST_CAPE_COLD_CURRENT_ID,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    x: 57,
    y: 31,
    marker: "cape",
    note: "暖流北折後抵達的冷霧岬角"
  }),
  Object.freeze({
    id: MONSOON_ARCHIPELAGO_ID,
    regionId: MONSOON_ARCHIPELAGO_ID,
    x: 27,
    y: 20,
    marker: "islands",
    note: "寒舌隨長風擺向的群島港口"
  }),
  Object.freeze({
    id: GRAYCROWN_STONE_COAST_ID,
    regionId: GRAYCROWN_STONE_COAST_ID,
    x: 8,
    y: 5,
    marker: "stone-coast",
    note: "風浪磨出的灰色石岸仍待測繪"
  })
]);

export const CHART_ROUTE_PATHS = Object.freeze([
  Object.freeze({
    id: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    routeId: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID,
    controlX: 54,
    controlY: 66,
    note: "相鄰暖流航線預告"
  }),
  Object.freeze({
    id: LUMINOUS_TO_MIST_CAPE_ROUTE_ID,
    routeId: LUMINOUS_TO_MIST_CAPE_ROUTE_ID,
    controlX: 72,
    controlY: 39,
    note: "暖水與寒流相遇的潮界航線"
  }),
  Object.freeze({
    id: MIST_CAPE_TO_MONSOON_ROUTE_ID,
    routeId: MIST_CAPE_TO_MONSOON_ROUTE_ID,
    controlX: 40,
    controlY: 22,
    note: "寒流細舌隨長風擺向群島的正式航線"
  }),
  Object.freeze({
    id: MONSOON_TO_GRAYCROWN_ROUTE_ID,
    routeId: MONSOON_TO_GRAYCROWN_ROUTE_ID,
    controlX: 16,
    controlY: 12,
    note: "從風候石長浪刻痕延伸的灰冠預覽航線"
  })
]);

export function chartRegionPointById(regionId) {
  return CHART_REGION_POINTS.find(point => point.regionId === regionId) || null;
}

export function chartRoutePathById(routeId) {
  return CHART_ROUTE_PATHS.find(path => path.routeId === routeId) || null;
}
