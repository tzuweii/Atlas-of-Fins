import test from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS, AQUARIUM_DECORATIONS, BAITS, BAY_EVENTS, COMMISSION_TEMPLATES, CONTENT_VALIDATION,
  CHART_REGION_POINTS, CHART_ROUTE_PATHS, DAILY_GOAL_TEMPLATES, FISH, FURNITURE, RARITY,
  REGIONS, RESIDENTS, RODS, ROUTES, SHIPS, SHIP_FURNITURE, SHIP_INTERIOR_SCENES,
  SPOTS, TIDEGLOW_SOURCES, TIMES
} from "../src/data.js";
import { formatContentValidationErrors, validateContentCatalog } from "../src/data/content-validation.js";

const currentCatalog = () => ({
  times: structuredClone(TIMES),
  spots: structuredClone(SPOTS),
  rods: structuredClone(RODS),
  baits: structuredClone(BAITS),
  furniture: structuredClone(FURNITURE),
  fish: structuredClone(FISH),
  rarities: structuredClone(RARITY),
  dailyGoals: structuredClone(DAILY_GOAL_TEMPLATES),
  events: structuredClone(BAY_EVENTS),
  achievements: structuredClone(ACHIEVEMENTS),
  aquariumDecorations: structuredClone(AQUARIUM_DECORATIONS),
  regions: structuredClone(REGIONS),
  routes: structuredClone(ROUTES),
  residents: structuredClone(RESIDENTS),
  commissions: structuredClone(COMMISSION_TEMPLATES),
  chartRegions: structuredClone(CHART_REGION_POINTS),
  chartRoutes: structuredClone(CHART_ROUTE_PATHS),
  tideglowSources: structuredClone(TIDEGLOW_SOURCES),
  ships: structuredClone(SHIPS),
  shipFurniture: structuredClone(SHIP_FURNITURE),
  shipInteriors: structuredClone(SHIP_INTERIOR_SCENES)
});

test("current content catalog has unique IDs and valid references", () => {
  assert.equal(CONTENT_VALIDATION.ok, true, formatContentValidationErrors(CONTENT_VALIDATION));
  assert.deepEqual(CONTENT_VALIDATION.errors, []);
});

test("content validation reports duplicate IDs and the exact broken reference source", () => {
  const catalog = currentCatalog();
  catalog.fish.push({ ...structuredClone(catalog.fish[0]), spots: ["missing-spot"] });
  catalog.events[0].fishIds.push("missing-fish");
  catalog.dailyGoals.find(goal => goal.id === "shrimp1").condition.baitIds[0] = "missing-bait";
  catalog.commissions[0].residentId = "missing-resident";

  const report = validateContentCatalog(catalog);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === "duplicate-id" && error.itemId === "sardine"));
  assert.ok(report.errors.some(error => error.path === "fish[sardine].spots[0]" && error.message.includes("missing-spot")));
  assert.ok(report.errors.some(error => error.path === "events[silver_tide].fishIds[2]" && error.message.includes("missing-fish")));
  assert.ok(report.errors.some(error => error.path === "dailyGoals[shrimp1].condition.baitIds[0]" && error.message.includes("missing-bait")));
  assert.ok(report.errors.some(error => error.path === "commissions[keeper_shore_notes].residentId" && error.message.includes("missing-resident")));
  assert.ok(report.disabledIds.fish.includes("sardine"));
  assert.match(formatContentValidationErrors(report), /fish\[sardine\]\.spots\[0\]/);
});

test("future region, route, and resident references use the same validation boundary", () => {
  const catalog = currentCatalog();
  catalog.regions = [{ id: "sleeping_tide_bay", spotIds: ["shore"], residentIds: ["watcher"] }];
  catalog.residents = [{ id: "watcher", regionId: "sleeping_tide_bay" }];
  catalog.commissions = [];
  catalog.routes = [{ id: "first_route", fromRegionId: "sleeping_tide_bay", toRegionId: "missing-region" }];
  catalog.chartRegions = [{ id: "missing-point", regionId: "missing-region", x: 101, y: 50 }];
  catalog.chartRoutes = [{ id: "missing-path", routeId: "missing-route", controlX: 50, controlY: -1 }];

  const report = validateContentCatalog(catalog);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.path === "routes[first_route].toRegionId"));
  assert.ok(report.errors.some(error => error.path === "chartRegions[missing-point].regionId"));
  assert.ok(report.errors.some(error => error.path === "chartRegions[missing-point]" && error.code === "invalid-position"));
  assert.ok(report.errors.some(error => error.path === "chartRoutes[missing-path].routeId"));
  assert.ok(report.errors.some(error => error.path === "chartRoutes[missing-path]" && error.code === "invalid-position"));
  assert.ok(report.disabledIds.routes.includes("first_route"));
  assert.ok(report.disabledIds.chartRegions.includes("missing-point"));
  assert.ok(report.disabledIds.chartRoutes.includes("missing-path"));
});

test("luminous fish cannot use observation points or omit ecology and SVG fallback metadata", () => {
  const catalog = currentCatalog();
  const fish = catalog.fish.find(entry => entry.id === "bluegreen_chromis");
  fish.habitats[0].spotIds = ["starlight_observation_cape"];
  fish.shape = "missing-shape";
  delete fish.ecologySource;

  const report = validateContentCatalog(catalog);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === "invalid-activity" && error.path.includes("bluegreen_chromis")));
  assert.ok(report.errors.some(error => error.code === "invalid-shape" && error.path === "fish[bluegreen_chromis].shape"));
  assert.ok(report.errors.some(error => error.code === "missing-ecology" && error.path === "fish[bluegreen_chromis].ecologySource"));
});

test("Tideglow sources require unique event types, positive points, and stable reference keys", () => {
  const catalog = currentCatalog();
  catalog.tideglowSources[1].eventType = catalog.tideglowSources[0].eventType;
  catalog.tideglowSources[2].points = 0;
  catalog.tideglowSources[3].refKey = "";
  const report = validateContentCatalog(catalog);
  assert.ok(report.errors.some(error => error.code === "duplicate-event-type"));
  assert.ok(report.errors.some(error => error.code === "invalid-points"));
  assert.ok(report.errors.some(error => error.code === "missing-source-key"));
});

test("ship catalog validates progression order, permanent prices, and preview boundaries", () => {
  const catalog = currentCatalog();
  catalog.ships[1].speedMultiplier = .9;
  catalog.ships[2].tideglowRequired = 10;
  catalog.ships[3].price = 9000;
  const report = validateContentCatalog(catalog);
  assert.ok(report.errors.some(error => error.code === "invalid-speed"));
  assert.ok(report.errors.some(error => error.code === "invalid-threshold"));
  assert.ok(report.errors.some(error => error.code === "preview-price"));
});

test("ship interiors validate ship references, common slots, coordinates, and price tiers", () => {
  const catalog = currentCatalog();
  catalog.shipFurniture.find(item => item.id === "tidewhisper_woven_quilt").price = 181;
  catalog.shipFurniture.find(item => item.id === "voyager_reading_lamp").slot = "engine";
  const scene = catalog.shipInteriors.find(item => item.shipId === "tidewhisper_residence");
  delete scene.slots.corner;
  scene.slots.sleep.x = 120;
  const report = validateContentCatalog(catalog);
  assert.ok(report.errors.some(error => error.code === "invalid-price-tier"));
  assert.ok(report.errors.some(error => error.code === "invalid-slot"));
  assert.ok(report.errors.some(error => error.code === "missing-slot"));
  assert.ok(report.errors.some(error => error.code === "invalid-position"));
});
