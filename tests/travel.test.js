import test from "node:test";
import assert from "node:assert/strict";
import {
  LUMINOUS_ARCHIPELAGO_ID, ROUTES, SLEEPING_TIDE_BAY_ID,
  SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
} from "../src/data.js";
import {
  DEVELOPER_TRAVEL_SCALES, FAMILIAR_TRAVEL_DURATION_MS, FIRST_TRAVEL_DURATION_MS,
  beginRouteTravel, createDeveloperState, createInitialState, developerArriveTravel,
  developerResetRouteState, developerSetTravelScale, dockAtDestination,
  getRouteDurationForState, getRouteTravelDurationMs, getTravelStatus, migrateState,
  progressTravel
} from "../src/core.js";

const ROUTE_ID = SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID;
const T0 = "2026-01-01T00:00:00.000Z";
const atMinutes = minutes => new Date(Date.parse(T0) + minutes * 60000).toISOString();

test("first voyage distance profiles and familiar route time follow the design contract", () => {
  const route = ROUTES[0];
  assert.deepEqual(FIRST_TRAVEL_DURATION_MS, { short: 360000, medium: 720000, long: 1440000 });
  assert.equal(FAMILIAR_TRAVEL_DURATION_MS, 180000);
  assert.equal(getRouteTravelDurationMs({ ...route, distanceClass: "short" }, { completedRouteIds: [] }), 360000);
  assert.equal(getRouteTravelDurationMs({ ...route, distanceClass: "medium" }, { completedRouteIds: [] }), 720000);
  assert.equal(getRouteTravelDurationMs({ ...route, distanceClass: "long" }, { completedRouteIds: [] }), 1440000);
  assert.equal(getRouteTravelDurationMs(route, { completedRouteIds: [route.id] }), FAMILIAR_TRAVEL_DURATION_MS);
});

test("a first journey advances by real elapsed time and arrives offshore exactly once", () => {
  const state = createInitialState();
  const before = structuredClone(state.world);
  const started = beginRouteTravel(state, ROUTE_ID, T0);
  assert.equal(started.ok, true);
  assert.equal(started.durationMs, FIRST_TRAVEL_DURATION_MS.short);
  assert.deepEqual(before.docking, { status: "docked", regionId: SLEEPING_TIDE_BAY_ID });
  assert.equal(state.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(state.world.visitedRegionIds, [SLEEPING_TIDE_BAY_ID]);
  const duplicate = beginRouteTravel(state, ROUTE_ID, atMinutes(1));
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "not-docked");

  const middle = progressTravel(state, atMinutes(2.5));
  assert.equal(middle.arrived, false);
  assert.equal(getTravelStatus(state.world).segment, 2);
  assert.equal(getTravelStatus(state.world).elapsedMs, 150000);

  const arrived = progressTravel(state, atMinutes(6));
  assert.equal(arrived.arrived, true);
  assert.equal(state.world.travel, null);
  assert.equal(state.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.deepEqual(state.world.docking, { status: "offshore", regionId: LUMINOUS_ARCHIPELAGO_ID });
  assert.deepEqual(state.world.completedRouteIds, [ROUTE_ID]);
  assert.deepEqual(state.world.visitedRegionIds, [SLEEPING_TIDE_BAY_ID]);

  const repeated = progressTravel(state, atMinutes(99));
  assert.equal(repeated.ok, false);
  assert.equal(repeated.reason, "not-traveling");
  assert.deepEqual(state.world.docking, { status: "offshore", regionId: LUMINOUS_ARCHIPELAGO_ID });
});

test("locked routes and invalid clocks fail without changing world state", () => {
  const locked = createInitialState();
  locked.world.unlockedRouteIds = [];
  const lockedBefore = structuredClone(locked.world);
  const lockedResult = beginRouteTravel(locked, ROUTE_ID, T0);
  assert.equal(lockedResult.ok, false);
  assert.equal(lockedResult.reason, "route-locked");
  assert.deepEqual(locked.world, lockedBefore);

  const invalid = createInitialState();
  const invalidBefore = structuredClone(invalid.world);
  const invalidResult = beginRouteTravel(invalid, ROUTE_ID, "not-a-date");
  assert.equal(invalidResult.ok, false);
  assert.equal(invalidResult.reason, "invalid-time");
  assert.deepEqual(invalid.world, invalidBefore);
});

test("clock rollback never removes progress and a large forward jump completes safely", () => {
  const state = createInitialState();
  beginRouteTravel(state, ROUTE_ID, T0);
  progressTravel(state, atMinutes(2));
  assert.equal(getTravelStatus(state.world).elapsedMs, 120000);

  progressTravel(state, atMinutes(1));
  assert.equal(getTravelStatus(state.world).elapsedMs, 120000);
  assert.equal(state.world.travel.lastCheckedAt, atMinutes(1));

  const jumped = progressTravel(state, "2036-01-01T00:00:00.000Z");
  assert.equal(jumped.arrived, true);
  assert.equal(state.world.travel, null);
  assert.equal(state.world.docking.status, "offshore");
});

test("docking records first arrival and the reverse familiar voyage remains available", () => {
  const state = createInitialState();
  assert.equal(dockAtDestination(state, T0).ok, false);
  beginRouteTravel(state, ROUTE_ID, T0);
  progressTravel(state, atMinutes(6));
  const docked = dockAtDestination(state, atMinutes(7));
  assert.equal(docked.ok, true);
  assert.equal(docked.firstArrival, true);
  assert.equal(state.world.currentRegionId, LUMINOUS_ARCHIPELAGO_ID);
  assert.deepEqual(state.world.docking, { status: "docked", regionId: LUMINOUS_ARCHIPELAGO_ID });
  assert.equal(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].firstArrivedAt, atMinutes(7));
  assert.equal(getRouteDurationForState(state, ROUTE_ID), FAMILIAR_TRAVEL_DURATION_MS);

  const returning = beginRouteTravel(state, ROUTE_ID, atMinutes(8));
  assert.equal(returning.ok, true);
  assert.equal(returning.durationMs, FAMILIAR_TRAVEL_DURATION_MS);
  assert.equal(state.world.travel.fromRegionId, LUMINOUS_ARCHIPELAGO_ID);
  assert.equal(state.world.travel.toRegionId, SLEEPING_TIDE_BAY_ID);
  progressTravel(state, atMinutes(11));
  assert.deepEqual(state.world.docking, { status: "offshore", regionId: SLEEPING_TIDE_BAY_ID });
  dockAtDestination(state, atMinutes(12));
  assert.equal(state.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.equal(state.world.regionProgress[LUMINOUS_ARCHIPELAGO_ID].firstArrivedAt, atMinutes(7));
});

test("serialized travel resumes offline without losing segment progress", () => {
  const state = createInitialState();
  beginRouteTravel(state, ROUTE_ID, T0);
  progressTravel(state, atMinutes(1));
  const reloaded = migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(getTravelStatus(reloaded.world).elapsedMs, 60000);
  assert.equal(getTravelStatus(reloaded.world).segment, 1);
  progressTravel(reloaded, atMinutes(4));
  assert.equal(getTravelStatus(reloaded.world).elapsedMs, 240000);
  assert.equal(getTravelStatus(reloaded.world).segment, 3);
});

test("developer controls scale, arrive, and reset only the implemented route state", () => {
  const state = createDeveloperState();
  assert.deepEqual(DEVELOPER_TRAVEL_SCALES, [1, 0.1, 0.01]);
  assert.equal(developerSetTravelScale(state, 0.01), true);
  assert.equal(getRouteDurationForState(state, ROUTE_ID), 3600);
  assert.equal(beginRouteTravel(state, ROUTE_ID, T0).ok, true);
  assert.equal(developerArriveTravel(state, atMinutes(1)), true);
  assert.deepEqual(state.world.docking, { status: "offshore", regionId: LUMINOUS_ARCHIPELAGO_ID });
  assert.equal(developerResetRouteState(state), true);
  assert.equal(state.world.currentRegionId, SLEEPING_TIDE_BAY_ID);
  assert.equal(state.world.travel, null);
  assert.deepEqual(state.world.completedRouteIds, []);
  assert.deepEqual(state.world.unlockedRouteIds, [ROUTE_ID]);

  const normal = createInitialState();
  assert.equal(developerSetTravelScale(normal, 0.01), false);
  assert.equal(developerArriveTravel(normal, T0), false);
  assert.equal(developerResetRouteState(normal), false);
});
