import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_LAYOUT, CHART_REGION_POINTS, CHART_ROUTE_PATHS, CONTENT_VALIDATION,
  SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  CHART_VIEW_LIMITS, createInitialState, migrateState, normalizeChartView,
  panChartView, requestChartRoute, zoomChartView
} from "../src/core.js";

test("programmatic chart data shares the content validation boundary", () => {
  assert.equal(CHART_LAYOUT.visualMode, "programmatic-css");
  assert.equal(CHART_LAYOUT.artStatus, "deferred");
  assert.equal(CHART_REGION_POINTS.length, 2);
  assert.equal(CHART_ROUTE_PATHS.length, 1);
  assert.equal(CONTENT_VALIDATION.ok, true);
  for (const point of CHART_REGION_POINTS) {
    assert.ok(point.x >= 0 && point.x <= 100);
    assert.ok(point.y >= 0 && point.y <= 100);
  }
});

test("chart zoom and pan normalize malformed values and stop at calm interaction limits", () => {
  assert.deepEqual(normalizeChartView(null), { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(normalizeChartView({ zoom: 0, x: null, y: Infinity }), { zoom: 0.8, x: 0, y: 0 });
  assert.deepEqual(
    normalizeChartView({ zoom: 99, x: -999, y: "bad" }),
    { zoom: CHART_VIEW_LIMITS.maxZoom, x: -CHART_VIEW_LIMITS.panLimit, y: 0 }
  );

  let view = { zoom: 1, x: 0, y: 0 };
  for (let index = 0; index < 10; index += 1) view = zoomChartView(view, 1);
  assert.equal(view.zoom, CHART_VIEW_LIMITS.maxZoom);
  for (let index = 0; index < 20; index += 1) view = panChartView(view, 4, -4);
  assert.deepEqual(view, {
    zoom: CHART_VIEW_LIMITS.maxZoom,
    x: CHART_VIEW_LIMITS.panLimit,
    y: -CHART_VIEW_LIMITS.panLimit
  });
});

test("new games and migrated saves always receive a safe chart view", () => {
  assert.deepEqual(createInitialState().chartView, { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(migrateState({ version: 4, chartView: { zoom: -4, x: 90, y: -90 } }).chartView, {
    zoom: CHART_VIEW_LIMITS.minZoom,
    x: CHART_VIEW_LIMITS.panLimit,
    y: -CHART_VIEW_LIMITS.panLimit
  });
  assert.deepEqual(migrateState({ version: 3 }).chartView, { zoom: 1, x: 0, y: 0 });
});

test("available chart routes create a timed journey without mutating the input world", () => {
  const world = createInitialState().world;
  world.unlockedRouteIds = [SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID];
  const before = structuredClone(world);
  const result = requestChartRoute(world, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, "2026-01-01T00:00:00.000Z");
  assert.equal(result.ok, true);
  assert.notEqual(result.world, world);
  assert.equal(result.world.travel.routeId, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID);
  assert.equal(result.world.docking.status, "traveling");
  assert.deepEqual(world, before);
  assert.equal(world.travel, null);
});
