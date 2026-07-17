const intersects = (required, available) => !Array.isArray(required) || required.length === 0
  || required.some(value => available?.includes(value));

export function isManualProgressEvent(event) {
  return event?.source === "manual";
}

export function progressIncrement(condition, event) {
  if (!condition || !isManualProgressEvent(event) || event.type !== condition.eventType) return 0;
  if (event.type === "sell") return condition.metric === "amount" ? Math.max(0, Number(event.amount) || 0) : 0;
  if (event.type !== "catch" || !event.fish || !event.caught) return 0;

  if (!intersects(condition.regionIds, [event.regionId])) return 0;
  if (!intersects(condition.spotIds, [event.spotId])) return 0;
  if (!intersects(condition.timeIds, [event.timeId])) return 0;
  if (!intersects(condition.weatherIds, [event.weather])) return 0;
  if (!intersects(condition.baitIds, [event.baitId])) return 0;
  if (!intersects(condition.fishIds, [event.fish.id])) return 0;
  if (!intersects(condition.rarityIds, [event.fish.rarity])) return 0;
  if (!intersects(condition.fishTags, event.fish.tags || [])) return 0;
  if (!intersects(condition.sizeTiers, [event.caught.sizeTier])) return 0;
  return 1;
}

export function isProgressConditionAvailable(condition, context = {}) {
  if (!condition || !["catch", "sell"].includes(condition.eventType)) return false;
  if (condition.eventType === "sell") return true;
  if (Array.isArray(context.availableRegionIds) && !intersects(condition.regionIds, context.availableRegionIds)) return false;
  if (Array.isArray(context.availableSpotIds) && !intersects(condition.spotIds, context.availableSpotIds)) return false;
  if (Array.isArray(context.availableBaitIds) && !intersects(condition.baitIds, context.availableBaitIds)) return false;

  const fishCatalog = Array.isArray(context.fishCatalog) ? context.fishCatalog : [];
  const availableFishIds = Array.isArray(context.availableFishIds) ? context.availableFishIds : [];
  if (!fishCatalog.length || !availableFishIds.length) return true;
  return fishCatalog.some(fish => {
    if (!availableFishIds.includes(fish.id)) return false;
    if (!intersects(condition.fishIds, [fish.id])) return false;
    if (!intersects(condition.rarityIds, [fish.rarity])) return false;
    if (!intersects(condition.fishTags, fish.tags || [])) return false;
    if (!intersects(condition.baitIds, fish.baits || [])) return false;
    const habitats = Array.isArray(fish.habitats) ? fish.habitats : [];
    if (!habitats.length) return true;
    return habitats.some(habitat => {
      if (Array.isArray(context.availableRegionIds) && !context.availableRegionIds.includes(habitat.regionId)) return false;
      if (!intersects(condition.regionIds, [habitat.regionId])) return false;
      const availableHabitatSpots = habitat.spotIds?.filter(spotId => !Array.isArray(context.availableSpotIds) || context.availableSpotIds.includes(spotId)) || [];
      if (!availableHabitatSpots.length || !intersects(condition.spotIds, availableHabitatSpots)) return false;
      if (!intersects(condition.timeIds, habitat.timeIds || [])) return false;
      if (!intersects(condition.weatherIds, habitat.weatherIds || [])) return false;
      return true;
    });
  });
}
