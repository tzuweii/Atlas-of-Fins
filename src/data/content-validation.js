const COLLECTION_NAMES = [
  "times", "spots", "rods", "baits", "furniture", "fish", "dailyGoals",
  "events", "achievements", "aquariumDecorations", "regions", "routes", "residents"
];

const WEATHER_IDS = new Set(["sunny", "rain"]);
const SIZE_TARGETS = new Set(["large"]);

const asArray = value => Array.isArray(value) ? value : [];

export function validateContentCatalog(content = {}) {
  const collections = Object.fromEntries(COLLECTION_NAMES.map(name => [name, asArray(content[name])]));
  const errors = [];
  const disabled = Object.fromEntries(COLLECTION_NAMES.map(name => [name, new Set()]));
  const ids = {};

  const addError = (code, collection, itemId, path, message) => {
    const safeItemId = itemId || "(missing-id)";
    errors.push({ code, collection, itemId: safeItemId, path, message });
    disabled[collection]?.add(safeItemId);
  };

  for (const [collection, entries] of Object.entries(collections)) {
    const seen = new Set();
    const duplicated = new Set();
    for (let index = 0; index < entries.length; index += 1) {
      const id = entries[index]?.id;
      if (typeof id !== "string" || !id.trim()) {
        addError("missing-id", collection, `#${index}`, `${collection}[${index}].id`, "內容 ID 必須是非空字串");
        continue;
      }
      if (seen.has(id)) duplicated.add(id);
      seen.add(id);
    }
    for (const id of duplicated) {
      addError("duplicate-id", collection, id, `${collection}[${id}].id`, `內容 ID「${id}」重複`);
    }
    ids[collection] = seen;
  }

  const rarityIds = new Set(Object.keys(content.rarities && typeof content.rarities === "object" ? content.rarities : {}));
  const fishTags = new Set(collections.fish.flatMap(fish => asArray(fish?.tags)));
  const requireReference = (collection, item, path, value, targetIds, targetName) => {
    if (typeof value === "string" && targetIds.has(value)) return;
    addError(
      "missing-reference",
      collection,
      item?.id,
      `${collection}[${item?.id || "missing-id"}].${path}`,
      `引用的${targetName} ID「${String(value)}」不存在`
    );
  };

  for (const spot of collections.spots) {
    if (spot?.requires) requireReference("spots", spot, "requires", spot.requires, ids.rods, "釣竿");
    if (spot?.regionId) requireReference("spots", spot, "regionId", spot.regionId, ids.regions, "區域");
  }

  for (const fish of collections.fish) {
    asArray(fish?.spots).forEach((id, index) => requireReference("fish", fish, `spots[${index}]`, id, ids.spots, "釣點"));
    asArray(fish?.times).forEach((id, index) => requireReference("fish", fish, `times[${index}]`, id, ids.times, "時段"));
    asArray(fish?.baits).forEach((id, index) => requireReference("fish", fish, `baits[${index}]`, id, ids.baits, "魚餌"));
    if (!rarityIds.has(fish?.rarity)) {
      addError("missing-reference", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].rarity`, `引用的稀有度 ID「${String(fish?.rarity)}」不存在`);
    }
    if (fish?.weather !== "any" && !WEATHER_IDS.has(fish?.weather)) {
      addError("missing-reference", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].weather`, `引用的天氣 ID「${String(fish?.weather)}」不存在`);
    }
    asArray(fish?.regionIds).forEach((id, index) => requireReference("fish", fish, `regionIds[${index}]`, id, ids.regions, "區域"));
    asArray(fish?.habitats).forEach((habitat, habitatIndex) => {
      requireReference("fish", fish, `habitats[${habitatIndex}].regionId`, habitat?.regionId, ids.regions, "區域");
      asArray(habitat?.spotIds).forEach((id, index) => {
        requireReference("fish", fish, `habitats[${habitatIndex}].spotIds[${index}]`, id, ids.spots, "釣點");
        const spot = collections.spots.find(entry => entry.id === id);
        if (spot && spot.regionId !== habitat?.regionId) {
          addError(
            "region-mismatch",
            "fish",
            fish?.id,
            `fish[${fish?.id || "missing-id"}].habitats[${habitatIndex}].spotIds[${index}]`,
            `釣點「${id}」不屬於區域「${String(habitat?.regionId)}」`
          );
        }
      });
      asArray(habitat?.timeIds).forEach((id, index) => requireReference("fish", fish, `habitats[${habitatIndex}].timeIds[${index}]`, id, ids.times, "時段"));
      asArray(habitat?.weatherIds).forEach((id, index) => {
        if (!WEATHER_IDS.has(id)) {
          addError("missing-reference", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].habitats[${habitatIndex}].weatherIds[${index}]`, `引用的天氣 ID「${String(id)}」不存在`);
        }
      });
    });
  }

  for (const event of collections.events) {
    if (event?.regionId) requireReference("events", event, "regionId", event.regionId, ids.regions, "區域");
    asArray(event?.fishIds).forEach((id, index) => requireReference("events", event, `fishIds[${index}]`, id, ids.fish, "魚種"));
    asArray(event?.spotIds).forEach((id, index) => requireReference("events", event, `spotIds[${index}]`, id, ids.spots, "釣點"));
    asArray(event?.timeIds).forEach((id, index) => requireReference("events", event, `timeIds[${index}]`, id, ids.times, "時段"));
    asArray(event?.weatherIds).forEach((id, index) => {
      if (!WEATHER_IDS.has(id)) addError("missing-reference", "events", event?.id, `events[${event?.id || "missing-id"}].weatherIds[${index}]`, `引用的天氣 ID「${String(id)}」不存在`);
    });
    if (event?.forceWeather && !WEATHER_IDS.has(event.forceWeather)) {
      addError("missing-reference", "events", event?.id, `events[${event?.id || "missing-id"}].forceWeather`, `引用的天氣 ID「${String(event.forceWeather)}」不存在`);
    }
  }

  for (const goal of collections.dailyGoals) {
    if (goal?.type === "rarity" && !rarityIds.has(goal.target)) {
      addError("missing-reference", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].target`, `引用的稀有度 ID「${String(goal.target)}」不存在`);
    } else if (goal?.type === "tag" && !fishTags.has(goal.target)) {
      addError("missing-reference", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].target`, `引用的魚類標籤「${String(goal.target)}」不存在`);
    } else if (goal?.type === "bait") {
      requireReference("dailyGoals", goal, "target", goal.target, ids.baits, "魚餌");
    } else if (goal?.type === "sell" && goal.target !== "coins") {
      addError("invalid-target", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].target`, "販售目標必須使用 coins");
    } else if (goal?.type === "size" && !SIZE_TARGETS.has(goal.target)) {
      addError("invalid-target", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].target`, `尺寸目標「${String(goal.target)}」不受支援`);
    } else if (!["rarity", "tag", "bait", "sell", "size"].includes(goal?.type)) {
      addError("invalid-type", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].type`, `每日目標類型「${String(goal?.type)}」不受支援`);
    }
  }

  for (const achievement of collections.achievements) {
    if (achievement?.reward?.type === "aquariumDecor") {
      requireReference("achievements", achievement, "reward.value", achievement.reward.value, ids.aquariumDecorations, "水族箱裝飾");
    }
  }

  for (const region of collections.regions) {
    asArray(region?.spotIds).forEach((id, index) => requireReference("regions", region, `spotIds[${index}]`, id, ids.spots, "釣點"));
    asArray(region?.residentIds).forEach((id, index) => requireReference("regions", region, `residentIds[${index}]`, id, ids.residents, "居民"));
  }
  for (const route of collections.routes) {
    requireReference("routes", route, "fromRegionId", route?.fromRegionId, ids.regions, "區域");
    requireReference("routes", route, "toRegionId", route?.toRegionId, ids.regions, "區域");
  }
  for (const resident of collections.residents) {
    requireReference("residents", resident, "regionId", resident?.regionId, ids.regions, "區域");
  }

  return {
    ok: errors.length === 0,
    errors,
    disabledIds: Object.fromEntries(Object.entries(disabled).map(([name, values]) => [name, [...values]]))
  };
}

export function formatContentValidationErrors(report) {
  if (report?.ok) return "內容資料驗證通過";
  return asArray(report?.errors).map(error => `[${error.code}] ${error.path}: ${error.message}`).join("\n");
}
