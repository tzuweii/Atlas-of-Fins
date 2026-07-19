import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BAITS, FISH, FISH_BODY_CLASSES, RARITY, REGIONS, SPOTS } from "../src/data.js";
import { getUnboostedFishAppearanceRate } from "../src/core.js";

const catalogPath = new URL("../docs/FISH_CATALOG.md", import.meta.url);

test("fish catalog document stays synchronized with the playable regional pools", () => {
  const markdown = readFileSync(catalogPath, "utf8");
  const documentedIds = [...markdown.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);

  assert.deepEqual(documentedIds, FISH.map(fish => fish.id));
  for (const region of REGIONS.filter(entry => entry.status === "available")) {
    const count = FISH.filter(fish => fish.habitats[0]?.regionId === region.id).length;
    assert.match(markdown, new RegExp(`^## ${region.name}（${count} 種）$`, "m"));
  }
  assert.match(markdown, /只用來快速查看遊戲現有魚種與平衡數字，不是內容開發規則/);
  assert.match(markdown, /未加成機率（出現 × 捕獲 = 成功）/);
  assert.doesNotMatch(markdown, /出現權重|捕獲率（木／輕／遠）/);
  for (const fish of FISH) {
    const habitat = fish.habitats[0];
    const appearanceRate = getUnboostedFishAppearanceRate(fish, habitat.regionId, habitat.spotIds[0]);
    const appearance = `${(appearanceRate * 100).toFixed(2)}%`;
    const capture = `${(RARITY[fish.rarity].catchRate * 100).toFixed(0)}%`;
    const success = `${(appearanceRate * RARITY[fish.rarity].catchRate * 100).toFixed(2)}%`;
    const row = markdown.split("\n").find(line => line.startsWith(`| \`${fish.id}\` |`));
    assert.ok(row?.includes(`${appearance} × ${capture} = ${success}`), `${fish.id} probability formula is documented`);
    assert.ok(row?.includes(`| ${FISH_BODY_CLASSES[fish.bodyClass].name} |`), `${fish.id} body class is documented`);
    assert.ok(row?.includes(`| ${RARITY[fish.rarity].name} |`), `${fish.id} rarity is documented`);
    for (const spotId of fish.spots) assert.ok(row?.includes(SPOTS.find(spot => spot.id === spotId).name), `${fish.id}/${spotId} is documented`);
    for (const baitId of fish.baits) assert.ok(row?.includes(BAITS.find(bait => bait.id === baitId).name), `${fish.id}/${baitId} bait is documented`);
  }
});
