import test from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS, AQUARIUM_DECORATIONS, BAITS, BAY_EVENTS, CONTENT_VALIDATION, DAILY_GOAL_TEMPLATES,
  FISH, FURNITURE, RARITY, REGIONS, RODS, ROUTES, SPOTS, TIMES
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
  residents: []
});

test("current content catalog has unique IDs and valid references", () => {
  assert.equal(CONTENT_VALIDATION.ok, true, formatContentValidationErrors(CONTENT_VALIDATION));
  assert.deepEqual(CONTENT_VALIDATION.errors, []);
});

test("content validation reports duplicate IDs and the exact broken reference source", () => {
  const catalog = currentCatalog();
  catalog.fish.push({ ...structuredClone(catalog.fish[0]), spots: ["missing-spot"] });
  catalog.events[0].fishIds.push("missing-fish");
  catalog.dailyGoals.find(goal => goal.type === "bait").target = "missing-bait";

  const report = validateContentCatalog(catalog);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.code === "duplicate-id" && error.itemId === "sardine"));
  assert.ok(report.errors.some(error => error.path === "fish[sardine].spots[0]" && error.message.includes("missing-spot")));
  assert.ok(report.errors.some(error => error.path === "events[silver_tide].fishIds[2]" && error.message.includes("missing-fish")));
  assert.ok(report.errors.some(error => error.path === "dailyGoals[shrimp1].target" && error.message.includes("missing-bait")));
  assert.ok(report.disabledIds.fish.includes("sardine"));
  assert.match(formatContentValidationErrors(report), /fish\[sardine\]\.spots\[0\]/);
});

test("future region, route, and resident references use the same validation boundary", () => {
  const catalog = currentCatalog();
  catalog.regions = [{ id: "sleeping_tide_bay", spotIds: ["shore"], residentIds: ["watcher"] }];
  catalog.residents = [{ id: "watcher", regionId: "sleeping_tide_bay" }];
  catalog.routes = [{ id: "first_route", fromRegionId: "sleeping_tide_bay", toRegionId: "missing-region" }];

  const report = validateContentCatalog(catalog);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some(error => error.path === "routes[first_route].toRegionId"));
  assert.ok(report.disabledIds.routes.includes("first_route"));
});
