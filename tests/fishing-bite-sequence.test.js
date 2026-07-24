import test from "node:test";
import assert from "node:assert/strict";
import { createFishingBitePlan, FISHING_BITE_TEMPLATE_IDS } from "../src/systems/fishing-bite-sequence.js";

const bait = { bite: 0.9 };
const fixedRandom = value => () => value;
const fish = (rarity, behavior = "steady") => ({ rarity, behavior });

test("bite sequence templates keep probe complexity ordered by rarity", () => {
  const commonPlans = [0, 1].map(value => createFishingBitePlan({ fish: fish("common"), bait }, fixedRandom(value)));
  const uncommonPlans = [0, 0.5, 1].map(value => createFishingBitePlan({ fish: fish("uncommon"), bait }, fixedRandom(value)));
  const rarePlans = [0, 1].map(value => createFishingBitePlan({ fish: fish("rare", "rare"), bait }, fixedRandom(value)));

  assert.deepEqual(new Set(commonPlans.map(plan => plan.probeCount)), new Set([1, 2]));
  assert.deepEqual(new Set(uncommonPlans.map(plan => plan.probeCount)), new Set([2, 3]));
  assert.deepEqual(new Set(rarePlans.map(plan => plan.probeCount)), new Set([4]));
  assert.ok(rarePlans.every(plan => plan.cues.some(cue => ["cross", "circle", "far-retreat"].includes(cue.type))));
});

test("planned higher rarity tiers continue adding probes to the rare scene pool", () => {
  const tiers = ["rare", "epic", "legendary", "mythic", "miracle"];
  assert.deepEqual(tiers.map(rarity => (
    createFishingBitePlan({ fish: fish(rarity, "rare"), bait }, fixedRandom(0)).probeCount
  )), [4, 5, 6, 7, 8]);
});

test("shared rarity pools vary the scene without binding one script to a species", () => {
  assert.deepEqual(FISHING_BITE_TEMPLATE_IDS.common, ["direct-confirm", "lively-short-pecks"]);
  assert.deepEqual(FISHING_BITE_TEMPLATE_IDS.rare, ["cautious-side-switch", "urgent-false-departure"]);

  const first = createFishingBitePlan({ fish: fish("rare", "sway"), bait }, fixedRandom(0));
  const second = createFishingBitePlan({ fish: fish("rare", "sway"), bait }, fixedRandom(1));
  assert.notEqual(first.id, second.id);
  assert.notDeepEqual(first.cues.map(cue => cue.type), second.cues.map(cue => cue.type));
});

test("cue timing varies while remaining bounded for the interaction", () => {
  const quickCommon = createFishingBitePlan({ fish: fish("common", "sprint"), bait }, fixedRandom(0));
  const slowCommon = createFishingBitePlan({ fish: fish("common", "endurance"), bait }, fixedRandom(1));
  const quickRare = createFishingBitePlan({ fish: fish("rare", "sprint"), bait }, fixedRandom(0));
  const slowRare = createFishingBitePlan({ fish: fish("rare", "endurance"), bait }, fixedRandom(1));

  assert.ok(quickCommon.totalDelayMs >= 4000);
  assert.ok(slowCommon.totalDelayMs < 9000);
  assert.ok(quickRare.totalDelayMs > quickCommon.totalDelayMs);
  assert.ok(slowRare.totalDelayMs < 16000);
  assert.notEqual(quickCommon.totalDelayMs, slowCommon.totalDelayMs);
});

test("more attractive bait shortens the first approach instead of extending it", () => {
  const fishEntry = fish("common");
  const bread = createFishingBitePlan({ fish: fishEntry, bait: { bite: 0.74 } }, fixedRandom(0.5));
  const cutFish = createFishingBitePlan({ fish: fishEntry, bait: { bite: 1.05 } }, fixedRandom(0.5));
  assert.ok(cutFish.initialDelayMs < bread.initialDelayMs);
});

test("no-bite casts use varied departure scenes and never end in a bite", () => {
  const quiet = createFishingBitePlan({ fish: null, bait }, fixedRandom(0));
  const distracted = createFishingBitePlan({ fish: null, bait }, fixedRandom(1));
  assert.equal(quiet.terminal, "departed");
  assert.equal(distracted.terminal, "departed");
  assert.notEqual(quiet.id, distracted.id);
  assert.ok(distracted.totalDelayMs < 16000);
});
