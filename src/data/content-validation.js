const COLLECTION_NAMES = [
  "times", "spots", "rods", "baits", "furniture", "fish", "dailyGoals",
  "events", "achievements", "aquariumDecorations", "regions", "routes", "residents", "commissions",
  "observations", "wonders", "researchNodes", "residentStoryScenes", "chartRegions", "chartRoutes",
  "tideglowSources"
];

const WEATHER_IDS = new Set(["sunny", "rain"]);
const SIZE_TARGETS = new Set(["small", "standard", "large", "record"]);
const ROUTE_DISTANCE_CLASSES = new Set(["short", "medium", "long"]);
const SPOT_ACTIVITY_TYPES = new Set(["fishing", "observation"]);
const FISH_BODY_SHAPES = new Set(["slender", "torpedo", "round", "flat", "spiky", "ribbon", "cephalopod", "mahi", "winged", "glow", "box", "needle"]);
const isChartPosition = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

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

  const validateReward = (collection, item, reward, path = "reward") => {
    if (reward?.type === "coins") {
      if (!(Number(reward.amount) > 0)) addError("invalid-reward", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.amount`, "金幣獎勵必須大於 0");
      return;
    }
    if (reward?.type === "bait") {
      requireReference(collection, item, `${path}.baitId`, reward.baitId, ids.baits, "魚餌");
      if (!(Number(reward.amount) > 0)) addError("invalid-reward", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.amount`, "魚餌獎勵數量必須大於 0");
      return;
    }
    addError("invalid-reward", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.type`, `獎勵類型「${String(reward?.type)}」不受支援`);
  };

  const validateProgressCondition = (collection, item, condition, path = "condition") => {
    if (!condition || !["catch", "sell"].includes(condition.eventType)) {
      addError("invalid-type", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.eventType`, `進度事件類型「${String(condition?.eventType)}」不受支援`);
      return;
    }
    asArray(condition.regionIds).forEach((id, index) => requireReference(collection, item, `${path}.regionIds[${index}]`, id, ids.regions, "區域"));
    asArray(condition.spotIds).forEach((id, index) => {
      requireReference(collection, item, `${path}.spotIds[${index}]`, id, ids.spots, "釣點");
      const spot = collections.spots.find(entry => entry.id === id);
      if (spot && asArray(condition.regionIds).length && !condition.regionIds.includes(spot.regionId)) {
        addError("region-mismatch", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.spotIds[${index}]`, `釣點「${id}」不屬於條件指定區域`);
      }
    });
    asArray(condition.timeIds).forEach((id, index) => requireReference(collection, item, `${path}.timeIds[${index}]`, id, ids.times, "時段"));
    asArray(condition.baitIds).forEach((id, index) => requireReference(collection, item, `${path}.baitIds[${index}]`, id, ids.baits, "魚餌"));
    asArray(condition.fishIds).forEach((id, index) => requireReference(collection, item, `${path}.fishIds[${index}]`, id, ids.fish, "魚種"));
    asArray(condition.rarityIds).forEach((id, index) => {
      if (!rarityIds.has(id)) addError("missing-reference", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.rarityIds[${index}]`, `引用的稀有度 ID「${String(id)}」不存在`);
    });
    asArray(condition.fishTags).forEach((id, index) => {
      if (!fishTags.has(id)) addError("missing-reference", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.fishTags[${index}]`, `引用的魚類標籤「${String(id)}」不存在`);
    });
    asArray(condition.weatherIds).forEach((id, index) => {
      if (!WEATHER_IDS.has(id)) addError("missing-reference", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.weatherIds[${index}]`, `引用的天氣 ID「${String(id)}」不存在`);
    });
    asArray(condition.sizeTiers).forEach((id, index) => {
      if (!SIZE_TARGETS.has(id)) addError("invalid-target", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.sizeTiers[${index}]`, `尺寸條件「${String(id)}」不受支援`);
    });
    if (condition.eventType === "sell" && condition.metric !== "amount") {
      addError("invalid-target", collection, item?.id, `${collection}[${item?.id || "missing-id"}].${path}.metric`, "販售進度必須使用 amount");
    }
  };

  for (const spot of collections.spots) {
    if (spot?.requires) requireReference("spots", spot, "requires", spot.requires, ids.rods, "釣竿");
    if (spot?.regionId) requireReference("spots", spot, "regionId", spot.regionId, ids.regions, "區域");
    if (!SPOT_ACTIVITY_TYPES.has(spot?.activityType || "fishing")) {
      addError("invalid-activity", "spots", spot?.id, `spots[${spot?.id || "missing-id"}].activityType`, `活動類型「${String(spot?.activityType)}」不受支援`);
    }
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
    if (!FISH_BODY_SHAPES.has(fish?.shape)) {
      addError("invalid-shape", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].shape`, `SVG fallback 輪廓「${String(fish?.shape)}」不存在`);
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
        if (spot && (spot.activityType || "fishing") !== "fishing") {
          addError(
            "invalid-activity",
            "fish",
            fish?.id,
            `fish[${fish?.id || "missing-id"}].habitats[${habitatIndex}].spotIds[${index}]`,
            `魚池不可引用非釣魚活動點「${id}」`
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
    const isLuminousOriginal = asArray(fish?.habitats).some(habitat => habitat?.regionId === "luminous_archipelago")
      && !asArray(fish?.habitats).some(habitat => habitat?.regionId === "sleeping_tide_bay");
    if (isLuminousOriginal) {
      if (typeof fish?.scientific !== "string" || !fish.scientific.includes(" ")) {
        addError("missing-ecology", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].scientific`, "琉光群島新魚需要學名");
      }
      if (typeof fish?.ecologySource?.label !== "string" || !/^https:\/\//.test(fish?.ecologySource?.url || "")) {
        addError("missing-ecology", "fish", fish?.id, `fish[${fish?.id || "missing-id"}].ecologySource`, "琉光群島新魚需要可追溯的 HTTPS 生態來源");
      }
    }
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
    validateProgressCondition("dailyGoals", goal, goal?.condition);
    validateReward("dailyGoals", goal, goal?.reward);
    if (!(Number(goal?.goal) > 0)) addError("invalid-goal", "dailyGoals", goal?.id, `dailyGoals[${goal?.id || "missing-id"}].goal`, "每日目標數量必須大於 0");
  }

  for (const achievement of collections.achievements) {
    if (achievement?.reward?.type === "aquariumDecor") {
      requireReference("achievements", achievement, "reward.value", achievement.reward.value, ids.aquariumDecorations, "水族箱裝飾");
    }
  }

  for (const region of collections.regions) {
    asArray(region?.spotIds).forEach((id, index) => requireReference("regions", region, `spotIds[${index}]`, id, ids.spots, "釣點"));
    asArray(region?.fishingSpotIds).forEach((id, index) => {
      requireReference("regions", region, `fishingSpotIds[${index}]`, id, ids.spots, "釣點");
      const spot = collections.spots.find(entry => entry.id === id);
      if (spot && ((spot.activityType || "fishing") !== "fishing" || spot.regionId !== region.id)) {
        addError("region-mismatch", "regions", region?.id, `regions[${region?.id || "missing-id"}].fishingSpotIds[${index}]`, `釣點「${id}」不是此區域的釣魚活動點`);
      }
    });
    asArray(region?.observationSpotIds).forEach((id, index) => {
      requireReference("regions", region, `observationSpotIds[${index}]`, id, ids.spots, "觀察點");
      const spot = collections.spots.find(entry => entry.id === id);
      if (spot && (spot.activityType !== "observation" || spot.regionId !== region.id)) {
        addError("region-mismatch", "regions", region?.id, `regions[${region?.id || "missing-id"}].observationSpotIds[${index}]`, `觀察點「${id}」不是此區域的觀察活動點`);
      }
    });
    asArray(region?.residentIds).forEach((id, index) => requireReference("regions", region, `residentIds[${index}]`, id, ids.residents, "居民"));
  }
  for (const route of collections.routes) {
    requireReference("routes", route, "fromRegionId", route?.fromRegionId, ids.regions, "區域");
    requireReference("routes", route, "toRegionId", route?.toRegionId, ids.regions, "區域");
    if (!ROUTE_DISTANCE_CLASSES.has(route?.distanceClass)) {
      addError("invalid-distance", "routes", route?.id, `routes[${route?.id || "missing-id"}].distanceClass`, `航線距離級別「${String(route?.distanceClass)}」不受支援`);
    }
    if (!(Number(route?.travelSegments) >= 1)) {
      addError("invalid-segments", "routes", route?.id, `routes[${route?.id || "missing-id"}].travelSegments`, "航線至少需要一個航段");
    }
  }
  for (const resident of collections.residents) {
    requireReference("residents", resident, "regionId", resident?.regionId, ids.regions, "區域");
  }
  for (const commission of collections.commissions) {
    requireReference("commissions", commission, "residentId", commission?.residentId, ids.residents, "居民");
    validateProgressCondition("commissions", commission, commission?.condition);
    validateReward("commissions", commission, commission?.reward);
    if (!(Number(commission?.goal) > 0)) addError("invalid-goal", "commissions", commission?.id, `commissions[${commission?.id || "missing-id"}].goal`, "委託目標數量必須大於 0");
  }
  for (const observation of collections.observations) {
    requireReference("observations", observation, "regionId", observation?.regionId, ids.regions, "區域");
    requireReference("observations", observation, "spotId", observation?.spotId, ids.spots, "觀察點");
    const spot = collections.spots.find(entry => entry.id === observation?.spotId);
    if (spot && (spot.activityType !== "observation" || spot.regionId !== observation.regionId)) {
      addError("invalid-activity", "observations", observation?.id, `observations[${observation?.id || "missing-id"}].spotId`, "正式觀察魚必須引用同區域的觀察活動點");
    }
    asArray(observation?.timeIds).forEach((id, index) => requireReference("observations", observation, `timeIds[${index}]`, id, ids.times, "時段"));
    asArray(observation?.weatherIds).forEach((id, index) => {
      if (!WEATHER_IDS.has(id)) addError("missing-reference", "observations", observation?.id, `observations[${observation?.id || "missing-id"}].weatherIds[${index}]`, `引用的天氣 ID「${String(id)}」不存在`);
    });
    asArray(observation?.requiresObservationIds).forEach((id, index) => requireReference("observations", observation, `requiresObservationIds[${index}]`, id, ids.observations, "前置觀察"));
    if (!(Number(observation?.pityVisits) >= 1) || !(Number(observation?.baseChance) >= 0 && Number(observation?.baseChance) <= 1)) {
      addError("invalid-observation-rate", "observations", observation?.id, `observations[${observation?.id || "missing-id"}]`, "正式觀察魚需要 0～1 機率與至少一次的保底次數");
    }
    if (typeof observation?.scientific !== "string" || !/^https:\/\//.test(observation?.ecologySource?.url || "")) {
      addError("missing-ecology", "observations", observation?.id, `observations[${observation?.id || "missing-id"}].ecologySource`, "正式觀察魚需要學名與可追溯的 HTTPS 生態來源");
    }
  }
  for (const wonder of collections.wonders) {
    requireReference("wonders", wonder, "regionId", wonder?.regionId, ids.regions, "區域");
    requireReference("wonders", wonder, "spotId", wonder?.spotId, ids.spots, "觀察點");
    const spot = collections.spots.find(entry => entry.id === wonder?.spotId);
    if (spot && (spot.activityType !== "observation" || spot.regionId !== wonder.regionId)) {
      addError("invalid-activity", "wonders", wonder?.id, `wonders[${wonder?.id || "missing-id"}].spotId`, "奇景必須引用同區域的觀察活動點");
    }
    asArray(wonder?.timeIds).forEach((id, index) => requireReference("wonders", wonder, `timeIds[${index}]`, id, ids.times, "時段"));
    asArray(wonder?.weatherIds).forEach((id, index) => {
      if (!WEATHER_IDS.has(id)) addError("missing-reference", "wonders", wonder?.id, `wonders[${wonder?.id || "missing-id"}].weatherIds[${index}]`, `引用的天氣 ID「${String(id)}」不存在`);
    });
    if (!(Number(wonder?.chance) >= 0 && Number(wonder?.chance) <= 1)) {
      addError("invalid-observation-rate", "wonders", wonder?.id, `wonders[${wonder?.id || "missing-id"}].chance`, "奇景出現機率必須介於 0～1");
    }
  }
  for (const node of collections.researchNodes) {
    requireReference("researchNodes", node, "regionId", node?.regionId, ids.regions, "區域");
    if (node?.requirement?.regionId) requireReference("researchNodes", node, "requirement.regionId", node.requirement.regionId, ids.regions, "區域");
    if (node?.requirement?.observationId) requireReference("researchNodes", node, "requirement.observationId", node.requirement.observationId, ids.observations, "正式觀察");
    if (node?.requirement?.spotId) {
      requireReference("researchNodes", node, "requirement.spotId", node.requirement.spotId, ids.spots, "釣點");
      const spot = collections.spots.find(entry => entry.id === node.requirement.spotId);
      if (spot && node.requirement.regionId && spot.regionId !== node.requirement.regionId) {
        addError("region-mismatch", "researchNodes", node?.id, `researchNodes[${node?.id || "missing-id"}].requirement.spotId`, "研究釣點不屬於條件指定區域");
      }
    }
    if (node?.requirement?.timeId) requireReference("researchNodes", node, "requirement.timeId", node.requirement.timeId, ids.times, "時段");
  }
  for (const scene of collections.residentStoryScenes) {
    requireReference("residentStoryScenes", scene, "residentId", scene?.residentId, ids.residents, "居民");
    if (scene?.trigger?.regionId) requireReference("residentStoryScenes", scene, "trigger.regionId", scene.trigger.regionId, ids.regions, "區域");
    if (scene?.trigger?.observationId) requireReference("residentStoryScenes", scene, "trigger.observationId", scene.trigger.observationId, ids.observations, "正式觀察");
    if (scene?.trigger?.nodeId) requireReference("residentStoryScenes", scene, "trigger.nodeId", scene.trigger.nodeId, ids.researchNodes, "研究節點");
  }
  for (const point of collections.chartRegions) {
    requireReference("chartRegions", point, "regionId", point?.regionId, ids.regions, "區域");
    if (![point?.x, point?.y].every(isChartPosition)) {
      addError("invalid-position", "chartRegions", point?.id, `chartRegions[${point?.id || "missing-id"}]`, "海圖節點座標必須位於 0～100 之間");
    }
  }
  for (const path of collections.chartRoutes) {
    requireReference("chartRoutes", path, "routeId", path?.routeId, ids.routes, "航線");
    if (![path?.controlX, path?.controlY].every(isChartPosition)) {
      addError("invalid-position", "chartRoutes", path?.id, `chartRoutes[${path?.id || "missing-id"}]`, "海圖航線控制點必須位於 0～100 之間");
    }
  }
  const eventTypes = new Set();
  for (const source of collections.tideglowSources) {
    if (typeof source?.eventType !== "string" || !source.eventType.trim()) {
      addError("invalid-type", "tideglowSources", source?.id, `tideglowSources[${source?.id || "missing-id"}].eventType`, "潮光來源需要事件類型");
    } else if (eventTypes.has(source.eventType)) {
      addError("duplicate-event-type", "tideglowSources", source?.id, `tideglowSources[${source.id}].eventType`, `事件類型「${source.eventType}」重複`);
    } else eventTypes.add(source.eventType);
    if (!(Number(source?.points) > 0)) {
      addError("invalid-points", "tideglowSources", source?.id, `tideglowSources[${source?.id || "missing-id"}].points`, "潮光分值必須大於 0");
    }
    for (const key of ["refKey", "sourcePrefix"]) {
      if (typeof source?.[key] !== "string" || !source[key].trim()) {
        addError("missing-source-key", "tideglowSources", source?.id, `tideglowSources[${source?.id || "missing-id"}].${key}`, "潮光來源需要穩定的去重鍵");
      }
    }
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
