export const SLEEPING_TIDE_BAY_ID = "sleeping_tide_bay";
export const LUMINOUS_ARCHIPELAGO_ID = "luminous_archipelago";
export const MIST_CAPE_COLD_CURRENT_ID = "mist_cape_cold_current";

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
    hint: "安靜觀察 · 不需魚餌",
    difficulty: 0,
    unlock: { type: "default" },
    sceneVariant: "luminous_observation",
    habitatTags: ["tropical", "observation", "tide-pool"],
    activityType: "observation",
    contentStatus: "complete"
  },
  {
    id: "fogfront_shelf",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧線陸棚",
    icon: "≋",
    description: "冷霧貼著陸棚緩慢移動，暖水魚群與冷水魚群在看不見的界線兩側轉身。",
    hint: "冷暖流交界 · 史詩魚可能出現",
    difficulty: 2,
    unlock: { type: "default" },
    sceneVariant: "mist_fogfront",
    habitatTags: ["temperate", "continental-shelf", "current-front", "fog"],
    activityType: "fishing"
  },
  {
    id: "whispering_kelp_forest",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "低語海藻林",
    icon: "♒",
    description: "高大海藻從岩底伸向微光，葉片把冷流拆成一層層安靜的背流面。",
    hint: "海藻林住民與岩礁魚",
    difficulty: 2,
    unlock: { type: "default" },
    sceneVariant: "mist_kelp_forest",
    habitatTags: ["temperate", "kelp", "reef", "cold-current"],
    activityType: "fishing"
  },
  {
    id: "bluecold_trench",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "藍寒深槽",
    icon: "◍",
    description: "岬角外的深槽收攏低溫水團，船燈下的藍色比霧更深也更慢。",
    hint: "需強化遠投竿 · 深水冷流魚",
    difficulty: 3,
    requires: "farcast",
    unlock: { type: "rod", rodId: "farcast" },
    sceneVariant: "mist_cold_trench",
    habitatTags: ["temperate", "offshore", "cold-current", "deep"],
    activityType: "fishing"
  },
  {
    id: "mistbell_overlook",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧鐘觀測崖",
    icon: "◌",
    description: "霧鐘下方的岩崖俯看海藻林冠，適合不拋竿地等待小魚自己露出位置。",
    hint: "安靜觀察 · 聽鐘辨位",
    difficulty: 0,
    unlock: { type: "default" },
    sceneVariant: "mist_observation",
    habitatTags: ["temperate", "observation", "kelp", "fog"],
    activityType: "observation",
    contentStatus: "complete"
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
    residentIds: ["chengye"],
    unlock: { type: "route", routeId: "sleeping_tide_to_luminous_archipelago" },
    palette: "luminous_archipelago",
    musicId: "windglass_current",
    ambientId: "coral_wind_chimes",
    arrivalCopy: "風棲港的繫纜柱從暖色海面裡靠近，這次停泊已安靜記進航程。",
    firstArrivalCopy: "暖色海面在風棲港外展開，澄野正把一只漂流觀測器從淺灘帶回岸邊。",
    journalPoolId: "luminous_archipelago",
    contentStatus: "complete",
    status: "available"
  },
  {
    id: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧岬寒流水道",
    portName: "聽霧港",
    currentProfile: "cold_warm_current_convergence_kelp",
    climateTags: ["temperate", "cold-current", "fog", "kelp"],
    spotIds: ["fogfront_shelf", "whispering_kelp_forest", "bluecold_trench", "mistbell_overlook"],
    fishingSpotIds: ["fogfront_shelf", "whispering_kelp_forest", "bluecold_trench"],
    observationSpotIds: ["mistbell_overlook"],
    residentIds: ["wuhe"],
    unlock: { type: "route", routeId: "luminous_archipelago_to_mist_cape" },
    palette: "mist_cape",
    musicId: "mistbell_strings",
    ambientId: "fog_bell_kelp_rustle",
    arrivalCopy: "灰藍岬影從冷霧裡慢慢靠近，霧鐘低響一聲，聽霧港的繫纜柱才在船首前顯出位置。",
    firstArrivalCopy: "溫度棚旁，一位披灰藍短披肩的觀測員正把紅線與藍線水溫筒並排掛好。霧禾先敲了一次鐘，再向你的船點頭。",
    journalPoolId: "mist_cape_cold_current",
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

export function fishCanAppearAtSpot(fish, regionId, spotId) {
  const habitat = getFishHabitat(fish, regionId);
  if (!habitat) return false;
  if (["common", "uncommon"].includes(fish?.rarity)) return true;
  return habitat.spotIds.includes(spotId);
}

export function getRegionFish(fishCatalog, regionId) {
  return fishCatalog.filter(fish => Boolean(getFishHabitat(fish, regionId)));
}

export function isRegionAvailable(regionId) {
  return regionById(regionId)?.status === "available";
}
