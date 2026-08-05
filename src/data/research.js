import {
  LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID, MONSOON_ARCHIPELAGO_ID,
  SLEEPING_TIDE_BAY_ID
} from "./regions.js";
import {
  BARRED_MUDSKIPPER_OBSERVATION_ID, CLARKS_ANEMONEFISH_OBSERVATION_ID,
  KELP_PIPEFISH_OBSERVATION_ID, PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID,
  TWO_SPINED_ANGELFISH_OBSERVATION_ID, YELLOW_SEAHORSE_OBSERVATION_ID
} from "./observations.js";

export const MAIN_RESEARCH_SPECIES_RATIO = 0.7;
export const mainResearchSpeciesGoal = totalSpecies => Math.ceil(
  Math.max(0, Math.floor(Number(totalSpecies) || 0)) * MAIN_RESEARCH_SPECIES_RATIO
);

export const LUMINOUS_RESEARCH_NODE_IDS = {
  arrival: "luminous_arrival",
  lagoon: "luminous_lagoon_notes",
  coral: "luminous_coral_garden",
  nightReef: "luminous_night_reef",
  anemonefish: "luminous_clarks_anemonefish",
  currentEdge: "luminous_current_edge",
  angelfish: "luminous_twospined_angelfish"
};

export const SLEEPING_TIDE_RESEARCH_NODE_IDS = {
  arrival: "sleeping_tide_arrival",
  shore: "sleeping_tide_shore",
  reef: "sleeping_tide_reef",
  night: "sleeping_tide_night",
  deep: "sleeping_tide_deep"
};

export const MIST_CAPE_RESEARCH_NODE_IDS = {
  arrival: "mist_cape_arrival",
  fogfront: "mist_cape_fogfront_shelf",
  kelp: "mist_cape_kelp_forest",
  trench: "mist_cape_cold_trench",
  night: "mist_cape_night_current",
  lumpsucker: "mist_cape_spiny_lumpsucker",
  pipefish: "mist_cape_kelp_pipefish"
};

export const MONSOON_RESEARCH_NODE_IDS = {
  arrival: "monsoon_arrival",
  windward: "monsoon_windward_whitecaps",
  leeward: "monsoon_leeward_seagrass",
  rainPlume: "monsoon_rainfresh_plume",
  night: "monsoon_night_windshift",
  mudskipper: "monsoon_barred_mudskipper",
  seahorse: "monsoon_yellow_seahorse"
};

export const RESEARCH_NODES = [
  {
    id: SLEEPING_TIDE_RESEARCH_NODE_IDS.arrival,
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "船屋在港燈下醒來",
    description: "從眠潮灣展開旅程，讓第一枚海域印記落進研究冊。",
    requirement: { type: "visited-region", regionId: SLEEPING_TIDE_BAY_ID }
  },
  {
    id: SLEEPING_TIDE_RESEARCH_NODE_IDS.shore,
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "近岸的第一道魚影",
    description: "在近岸淺水區留下當地魚類捕獲紀錄。",
    requirement: { type: "spot-discovery", regionId: SLEEPING_TIDE_BAY_ID, spotId: "shore" }
  },
  {
    id: SLEEPING_TIDE_RESEARCH_NODE_IDS.reef,
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "礁影有自己的住處",
    description: "在礁石邊緣留下當地魚類捕獲紀錄。",
    requirement: { type: "spot-discovery", regionId: SLEEPING_TIDE_BAY_ID, spotId: "reef" }
  },
  {
    id: SLEEPING_TIDE_RESEARCH_NODE_IDS.night,
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "船燈照見另一種潮路",
    description: "在眠潮灣夜間留下捕獲紀錄。",
    requirement: { type: "region-time-discovery", regionId: SLEEPING_TIDE_BAY_ID, timeId: "night" }
  },
  {
    id: SLEEPING_TIDE_RESEARCH_NODE_IDS.deep,
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "海灣深處仍有回聲",
    description: "使用遠投裝備，在海灣深水區留下捕獲紀錄。",
    requirement: { type: "spot-discovery", regionId: SLEEPING_TIDE_BAY_ID, spotId: "deep" }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.arrival,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "風在港口停了一會兒",
    description: "抵達風棲港，讓第一枚群島印記落在研究冊上。",
    requirement: { type: "visited-region", regionId: LUMINOUS_ARCHIPELAGO_ID }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.lagoon,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "潟湖的第一圈水紋",
    description: "在風棲淺灘記錄一種當地魚。",
    requirement: { type: "spot-discovery", regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "windrest_shallows" }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.coral,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "珊瑚把光分成許多路",
    description: "在稜光珊瑚庭記錄一種當地魚。",
    requirement: { type: "spot-discovery", regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "prism_coral_garden" }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.nightReef,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "夜裡仍醒著的礁",
    description: "在琉光群島的夜間留下捕獲紀錄。",
    requirement: { type: "region-time-discovery", regionId: LUMINOUS_ARCHIPELAGO_ID, timeId: "night" }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.anemonefish,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "不離開海葵的一頁",
    description: "在星落觀察岬記錄克氏雙鋸魚。",
    requirement: { type: "observation", observationId: CLARKS_ANEMONEFISH_OBSERVATION_ID }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.currentEdge,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "黑潮外緣的深藍筆跡",
    description: "在暖流藍渠記錄一種巡游魚。",
    requirement: { type: "spot-discovery", regionId: LUMINOUS_ARCHIPELAGO_ID, spotId: "warm_current_channel" }
  },
  {
    id: LUMINOUS_RESEARCH_NODE_IDS.angelfish,
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "礁影裡的紫橙微光",
    description: "讓雙棘甲尻魚自然游進觀察簿。",
    requirement: { type: "observation", observationId: TWO_SPINED_ANGELFISH_OBSERVATION_ID }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.arrival,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧鐘先替港口報上名字",
    description: "抵達聽霧港，讓冷暖雙色的第三枚海域印記落進研究冊。",
    requirement: { type: "visited-region", regionId: MIST_CAPE_COLD_CURRENT_ID }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.fogfront,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "魚群替看不見的潮界轉身",
    description: "在霧線陸棚記錄一種沿冷暖水交界活動的魚。",
    requirement: { type: "spot-discovery", regionId: MIST_CAPE_COLD_CURRENT_ID, spotId: "fogfront_shelf" }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.kelp,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "海藻把冷流分成許多房間",
    description: "在低語海藻林記錄一種利用林冠、莖或岩底的魚。",
    requirement: { type: "spot-discovery", regionId: MIST_CAPE_COLD_CURRENT_ID, spotId: "whispering_kelp_forest" }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.trench,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "深槽收好最慢的一層寒流",
    description: "使用遠投裝備，在藍寒深槽留下冷水魚紀錄。",
    requirement: { type: "spot-discovery", regionId: MIST_CAPE_COLD_CURRENT_ID, spotId: "bluecold_trench" }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.night,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "夜霧裡還有另一條等溫線",
    description: "在霧岬寒流水道的夜間留下捕獲紀錄。",
    requirement: { type: "region-time-discovery", regionId: MIST_CAPE_COLD_CURRENT_ID, timeId: "night" }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.lumpsucker,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "吸盤記住海藻根部的流速",
    description: "在霧鐘觀測崖記錄太平洋刺圓鰭魚。",
    requirement: { type: "observation", observationId: PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID }
  },
  {
    id: MIST_CAPE_RESEARCH_NODE_IDS.pipefish,
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "一段葉柄游過兩層水",
    description: "讓海藻海龍自然游進潮界觀察簿。",
    requirement: { type: "observation", observationId: KELP_PIPEFISH_OBSERVATION_ID }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.arrival,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "長風把第四枚印記吹進港",
    description: "沿寒流季節頁抵達回風港，完成停泊並讓風候石印記落進研究冊。",
    requirement: { type: "visited-region", regionId: MONSOON_ARCHIPELAGO_ID }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.windward,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "白沫替迎風浪畫出斜線",
    description: "在迎風白沫水道記錄一種沿長浪活動的群島魚。",
    requirement: { type: "spot-discovery", regionId: MONSOON_ARCHIPELAGO_ID, spotId: "windward_whitecap_passage" }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.leeward,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "島脊與草葉收住慢水",
    description: "在背風海草灣記錄一種利用遮蔽的群島魚。",
    requirement: { type: "spot-discovery", regionId: MONSOON_ARCHIPELAGO_ID, spotId: "leeward_seagrass_bay" }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.rainPlume,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "雨水用深色重畫鹽度邊界",
    description: "在雨天的雨脈紅樹岸留下淡水羽流捕獲紀錄。",
    requirement: { type: "spot-discovery", regionId: MONSOON_ARCHIPELAGO_ID, spotId: "rainmangrove_estuary" }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.night,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "夜風讓魚群換到另一層水",
    description: "在季風群島夜間留下捕獲紀錄。",
    requirement: { type: "region-time-discovery", regionId: MONSOON_ARCHIPELAGO_ID, timeId: "night" }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.mudskipper,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "濕泥也有一條潮間航線",
    description: "在風候石觀察台記錄大彈塗魚。",
    requirement: { type: "observation", observationId: BARRED_MUDSKIPPER_OBSERVATION_ID }
  },
  {
    id: MONSOON_RESEARCH_NODE_IDS.seahorse,
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "捲尾記住背風草床的慢流",
    description: "讓庫達海馬自然游進正式觀察簿。",
    requirement: { type: "observation", observationId: YELLOW_SEAHORSE_OBSERVATION_ID }
  }
];

export const REGION_RESEARCH = {
  [SLEEPING_TIDE_BAY_ID]: {
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "眠潮灣研究主路",
    description: "從棲地、時段與天氣逐步認識海灣；發現七成魚類即可取得前往下一片海域的海圖。",
    nodeIds: RESEARCH_NODES.filter(node => node.regionId === SLEEPING_TIDE_BAY_ID).map(node => node.id),
    mainSpeciesGoal: mainResearchSpeciesGoal(30),
    fullSpeciesGoal: 30,
    mainReward: {
      id: "sleeping_tide_research_book",
      type: "research-keepsake",
      label: "《眠潮灣棲地研究冊》"
    },
    fullRewards: [
      { id: "sleeping_tide_region_badge", type: "region-badge", label: "眠潮灣徽章" },
      { id: "sleeping_tide_sail_pattern", type: "sail-pattern", label: "眠潮魚群船帆紋樣" }
    ],
    preview: "燈塔保存著一張尚未交付的灣外海圖。"
  },
  [LUMINOUS_ARCHIPELAGO_ID]: {
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光群島研究主路",
    description: "這一頁會隨釣魚、換時段與安靜觀察自然亮起；發現七成魚類即可完成前往下一片海域的準備。",
    nodeIds: RESEARCH_NODES.filter(node => node.regionId === LUMINOUS_ARCHIPELAGO_ID).map(node => node.id),
    mainSpeciesGoal: mainResearchSpeciesGoal(33),
    fullSpeciesGoal: 33,
    mainReward: {
      id: "luminous_research_book",
      type: "research-keepsake",
      label: "《琉光暖流觀察冊》"
    },
    fullRewards: [
      { id: "luminous_region_badge", type: "region-badge", label: "琉光群島徽章" },
      { id: "luminous_sail_pattern", type: "sail-pattern", label: "琉光魚群船帆紋樣" }
    ],
    preview: "遠方的霧後，是一條向較冷水色彎去的潮路。"
  },
  [MIST_CAPE_COLD_CURRENT_ID]: {
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    name: "霧岬雙流研究主路",
    description: "從霧線、海藻林、深槽與正式觀察辨認冷暖水如何共同安排生命；發現七成魚類即可完成本章主研究。",
    nodeIds: RESEARCH_NODES.filter(node => node.regionId === MIST_CAPE_COLD_CURRENT_ID).map(node => node.id),
    mainSpeciesGoal: mainResearchSpeciesGoal(34),
    fullSpeciesGoal: 34,
    mainReward: {
      id: "mist_cape_temperature_fieldbook",
      type: "research-keepsake",
      label: "《霧岬潮界觀測冊》"
    },
    fullRewards: [
      { id: "mist_cape_region_badge", type: "region-badge", label: "霧岬寒流水道徽章" },
      { id: "mist_cape_sail_pattern", type: "sail-pattern", label: "霧岬雙流船帆紋樣" }
    ],
    preview: "霧禾的舊溫度頁顯示：寒流的季節擺動，與遠方風向一起改變。"
  },
  [MONSOON_ARCHIPELAGO_ID]: {
    regionId: MONSOON_ARCHIPELAGO_ID,
    name: "季風群島風候研究主路",
    description: "從迎背風、海草遮蔽、紅樹淡水羽流與正式觀察，讀出同一地方如何隨風與晴雨重排；發現七成魚類即可完成主研究。",
    nodeIds: RESEARCH_NODES.filter(node => node.regionId === MONSOON_ARCHIPELAGO_ID).map(node => node.id),
    mainSpeciesGoal: mainResearchSpeciesGoal(37),
    fullSpeciesGoal: 37,
    mainReward: {
      id: "monsoon_windwater_fieldbook",
      type: "research-keepsake",
      label: "《季風水色與棲地觀測冊》"
    },
    fullRewards: [
      { id: "monsoon_region_badge", type: "region-badge", label: "季風群島徽章" },
      { id: "monsoon_sail_pattern", type: "sail-pattern", label: "回風魚群船帆紋樣" }
    ],
    preview: "風候石最深的長浪刻痕，把圓灰石與下一條航線一起指向灰冠石岸。"
  }
};

export function researchNodeById(nodeId) {
  return RESEARCH_NODES.find(node => node.id === nodeId);
}

export function getRegionResearch(regionId) {
  return REGION_RESEARCH[regionId] || null;
}
