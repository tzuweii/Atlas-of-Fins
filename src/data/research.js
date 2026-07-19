import { LUMINOUS_ARCHIPELAGO_ID } from "./regions.js";
import {
  CLARKS_ANEMONEFISH_OBSERVATION_ID, TWO_SPINED_ANGELFISH_OBSERVATION_ID
} from "./observations.js";

export const LUMINOUS_RESEARCH_NODE_IDS = {
  arrival: "luminous_arrival",
  lagoon: "luminous_lagoon_notes",
  coral: "luminous_coral_garden",
  nightReef: "luminous_night_reef",
  anemonefish: "luminous_clarks_anemonefish",
  currentEdge: "luminous_current_edge",
  angelfish: "luminous_twospined_angelfish"
};

export const RESEARCH_NODES = [
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
  }
];

export const REGION_RESEARCH = {
  [LUMINOUS_ARCHIPELAGO_ID]: {
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    name: "琉光群島研究主路",
    description: "這一頁會隨釣魚、換時段與安靜觀察自然亮起，不需選擇研究專案。",
    nodeIds: RESEARCH_NODES.map(node => node.id),
    mainSpeciesGoal: 12,
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
  }
};

export function researchNodeById(nodeId) {
  return RESEARCH_NODES.find(node => node.id === nodeId);
}

export function getRegionResearch(regionId) {
  return REGION_RESEARCH[regionId] || null;
}
