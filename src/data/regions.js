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
  },
  {
    id: "windrest_shallows",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "風棲淺灘",
    icon: "≈",
    description: "細白浪花繞過暖色沙洲，小型魚群在港外清澈水光中穿梭。",
    hint: "暖流小型魚群",
    difficulty: 1,
    unlock: { type: "default" },
    sceneVariant: "luminous_shallows",
    habitatTags: ["tropical", "lagoon", "shallow"],
    activityType: "fishing"
  },
  {
    id: "prism_coral_garden",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "稜光珊瑚庭",
    icon: "◇",
    description: "枝狀珊瑚把陽光拆成柔和色帶，礁魚沿著陰影與亮面往返。",
    hint: "珊瑚礁魚較多",
    difficulty: 2,
    unlock: { type: "default" },
    sceneVariant: "luminous_coral",
    habitatTags: ["tropical", "coral", "reef"],
    activityType: "fishing"
  },
  {
    id: "warm_current_channel",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "暖流藍渠",
    icon: "◈",
    description: "島鏈外緣的深藍水道承接穩定暖流，大型巡游魚會順流靠近。",
    hint: "需強化遠投竿",
    difficulty: 3,
    requires: "farcast",
    unlock: { type: "rod", rodId: "farcast" },
    sceneVariant: "luminous_channel",
    habitatTags: ["tropical", "offshore", "warm-current", "deep"],
    activityType: "fishing"
  },
  {
    id: "starlight_observation_cape",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "星落觀察岬",
    icon: "⌾",
    description: "不拋竿的安靜岬角，退潮後能俯看礁盤與偶爾經過的特殊身影。",
    hint: "Slice G 觀察功能預留",
    difficulty: 0,
    unlock: { type: "default" },
    sceneVariant: "luminous_observation",
    habitatTags: ["tropical", "observation", "tide-pool"],
    activityType: "observation",
    contentStatus: "preview"
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
    spotIds: REGION_SPOTS.filter(spot => spot.regionId === SLEEPING_TIDE_BAY_ID).map(spot => spot.id),
    fishingSpotIds: ["shore", "reef", "deep"],
    observationSpotIds: [],
    residentIds: ["lighthouse_keeper", "fish_market_owner"],
    unlock: { type: "default" },
    palette: "sleeping_tide",
    musicId: "bay",
    ambientId: "sheltered_waves",
    journalPoolId: "sleeping_tide",
    contentStatus: "complete",
    status: "available"
  },
  {
    id: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光群島",
    portName: "風棲港",
    currentProfile: "warm_current_coral_archipelago",
    climateTags: ["tropical", "subtropical", "coral"],
    spotIds: ["windrest_shallows", "prism_coral_garden", "warm_current_channel", "starlight_observation_cape"],
    fishingSpotIds: ["windrest_shallows", "prism_coral_garden", "warm_current_channel"],
    observationSpotIds: ["starlight_observation_cape"],
    unlock: { type: "route", routeId: "sleeping_tide_to_luminous_archipelago" },
    palette: "luminous_archipelago",
    musicId: "windglass_current",
    ambientId: "coral_wind_chimes",
    journalPoolId: "luminous_archipelago",
    contentStatus: "complete",
    status: "available"
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

export function getRegionFishingSpots(regionId) {
  return getRegionSpots(regionId).filter(spot => (spot.activityType || "fishing") === "fishing");
}

export function getRegionObservationSpots(regionId) {
  return getRegionSpots(regionId).filter(spot => spot.activityType === "observation");
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
