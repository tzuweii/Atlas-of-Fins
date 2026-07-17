import { CHENGYE_ID } from "./residents.js";
import { LUMINOUS_ARCHIPELAGO_ID } from "./regions.js";
import {
  CLARKS_ANEMONEFISH_OBSERVATION_ID, TWO_SPINED_ANGELFISH_OBSERVATION_ID
} from "./observations.js";
import { LUMINOUS_RESEARCH_NODE_IDS } from "./research.js";

export const RESIDENT_STORY_SCENES = [
  {
    id: "chengye_drifting_observer",
    residentId: CHENGYE_ID,
    title: "繞了半片海的觀測器",
    locationName: "風棲港 · 曬網棚旁",
    trigger: { type: "visited-region", regionId: LUMINOUS_ARCHIPELAGO_ID },
    lines: [
      "先別踩到那顆螺帽——好，安全了。這個浮標大概繞了半片海，還是把自己送回港口。",
      "我是澄野，替群島記魚，也記那些不適合被帶走的相遇。你的船若會在這裡停一陣子，我們大概會常碰面。"
    ]
  },
  {
    id: "chengye_lagoon_margin",
    residentId: CHENGYE_ID,
    title: "潟湖邊緣的三種藍",
    locationName: "風棲港 · 觀測桌",
    trigger: { type: "region-species", regionId: LUMINOUS_ARCHIPELAGO_ID, count: 3 },
    lines: [
      "你帶回來的不是魚，是三種不同的水色。淺灘、珊瑚影，還有魚群轉身時那一下亮光。",
      "研究有時只是把『看見了』說得更仔細。不用急著替每件事找答案。"
    ]
  },
  {
    id: "chengye_anemone_home",
    residentId: CHENGYE_ID,
    title: "不帶走的第一頁",
    locationName: "星落觀察岬",
    jointObservation: true,
    trigger: { type: "observation", observationId: CLARKS_ANEMONEFISH_OBSERVATION_ID },
    lines: [
      "看見牠躲回海葵了嗎？別往前，留在這裡就好。",
      "有些收藏不需要拿在手上。知道牠仍住在原來的地方，這一頁反而更完整。"
    ]
  },
  {
    id: "chengye_current_edge",
    residentId: CHENGYE_ID,
    title: "黑潮頁角",
    locationName: "風棲港 · 防波堤",
    trigger: { type: "research-node", nodeId: LUMINOUS_RESEARCH_NODE_IDS.currentEdge },
    lines: [
      "藍渠外那道深色不是陰影，是暖流把很遠的海帶到群島邊上。",
      "我以前總想把每條線畫準。後來才懂，海圖也該留一點空白，讓下一次出航有地方落下。"
    ]
  },
  {
    id: "chengye_twospined_light",
    residentId: CHENGYE_ID,
    title: "礁影沒有關上門",
    locationName: "星落觀察岬",
    jointObservation: true,
    trigger: { type: "observation", observationId: TWO_SPINED_ANGELFISH_OBSERVATION_ID },
    lines: [
      "就是那片紫橙色。牠不是被我們找到，只是剛好願意從礁影裡出來。",
      "把時間也寫進去吧。不是『終於捕獲』，是『今天，我們一起等到了』。"
    ]
  },
  {
    id: "chengye_current_map",
    residentId: CHENGYE_ID,
    title: "留在海裡的收藏",
    locationName: "風棲港 · 黃昏碼頭",
    trigger: { type: "region-main-research", regionId: LUMINOUS_ARCHIPELAGO_ID },
    reward: {
      id: "chengye_handdrawn_current_map",
      type: "resident-keepsake",
      label: "澄野的手繪黑潮生態圖"
    },
    lines: [
      "十二種魚，兩次安靜的等待，還有一張沒有把生命帶離海裡的觀察頁。這樣就足夠叫作完整的研究了。",
      "這張圖給你。暖流再往前會擦過一片冷霧，水色會突然變得很薄。哪天想出發，就沿著我沒畫完的那條線走吧。"
    ]
  }
];

export function getResidentStoryScenes(residentId) {
  return RESIDENT_STORY_SCENES.filter(scene => scene.residentId === residentId);
}

export function residentStorySceneById(sceneId) {
  return RESIDENT_STORY_SCENES.find(scene => scene.id === sceneId);
}
