export const SLEEPING_TIDE_BAY_ID = "sleeping_tide_bay";
export const LUMINOUS_ARCHIPELAGO_ID = "luminous_archipelago";

export const REGION_SPOTS = [
  {
    id: "shore",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "近岸淺水區",
    icon: "⌁",
    description: "魚群活躍、咬餌快速，是最舒服的起點。",
    hint: "常見魚比例高",
    difficulty: 1,
    unlock: { type: "default" },
    sceneVariant: "shore",
    habitatTags: ["coastal", "shallow"]
  },
  {
    id: "reef",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "礁石邊緣",
    icon: "◒",
    description: "海草環繞著礁石，色彩鮮明的魚穿梭其中。",
    hint: "少見魚較多",
    difficulty: 2,
    unlock: { type: "default" },
    sceneVariant: "reef",
    habitatTags: ["coastal", "reef"]
  },
  {
    id: "deep",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "海灣深水區",
    icon: "◉",
    description: "深藍水域藏著大型與稀有的身影。",
    hint: "需強化遠投竿",
    difficulty: 3,
    requires: "farcast",
    unlock: { type: "rod", rodId: "farcast" },
    sceneVariant: "deep",
    habitatTags: ["offshore", "deep"]
  }
];

// v0.3 compatibility name. Region spots remain globally unique.
export const SPOTS = REGION_SPOTS;

export const REGIONS = [
  {
    id: SLEEPING_TIDE_BAY_ID,
    name: "眠潮灣",
    portName: "眠潮泊地",
    currentProfile: "temperate_subtropical_current_edge",
    climateTags: ["temperate", "subtropical", "coastal"],
    spotIds: REGION_SPOTS.map(spot => spot.id),
    unlock: { type: "default" },
    palette: "sleeping_tide",
    musicId: "bay",
    journalPoolId: "sleeping_tide",
    status: "available"
  },
  {
    id: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光群島",
    portName: "風棲港",
    currentProfile: "warm_current_coral_archipelago",
    climateTags: ["tropical", "subtropical", "coral"],
    spotIds: [],
    unlock: { type: "future-slice" },
    palette: "luminous_archipelago",
    musicId: null,
    journalPoolId: null,
    status: "preview"
  }
];

export function regionById(regionId) {
  return REGIONS.find(region => region.id === regionId);
}

export function regionSpotById(spotId) {
  return REGION_SPOTS.find(spot => spot.id === spotId);
}

export function getRegionSpots(regionId) {
  return REGION_SPOTS.filter(spot => spot.regionId === regionId);
}

export function getFishHabitat(fish, regionId) {
  return fish?.habitats?.find(habitat => habitat.regionId === regionId) || null;
}

export function getRegionFish(fishCatalog, regionId) {
  return fishCatalog.filter(fish => Boolean(getFishHabitat(fish, regionId)));
}

export function isRegionAvailable(regionId) {
  return regionById(regionId)?.status === "available";
}
