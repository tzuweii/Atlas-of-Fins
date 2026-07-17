import { LUMINOUS_ARCHIPELAGO_ID } from "./regions.js";

export const STARLIGHT_OBSERVATION_CAPE_ID = "starlight_observation_cape";
export const CLARKS_ANEMONEFISH_OBSERVATION_ID = "clarks_anemonefish";
export const TWO_SPINED_ANGELFISH_OBSERVATION_ID = "twospined_angelfish";

export const OBSERVATION_SUBJECTS = [
  {
    id: CLARKS_ANEMONEFISH_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    spotId: STARLIGHT_OBSERVATION_CAPE_ID,
    name: "克氏雙鋸魚",
    english: "Clark's anemonefish",
    scientific: "Amphiprion clarkii",
    icon: "◐",
    colors: ["#292f38", "#f1d66c", "#f7efe0"],
    timeIds: ["dawn", "day"],
    weatherIds: ["sunny", "rain"],
    baseChance: 0.58,
    pityVisits: 2,
    short: "黑黃身影在海葵觸手間進出，像替一座柔軟的小屋守著門。",
    detail: "克氏雙鋸魚生活在潟湖與外礁坡，會和多種海葵共同生活。牠不必離開自己的海葵，也能讓一頁收藏完整亮起。",
    hint: "清晨或白天，留意礁盤上那團會隨水流慢慢收放的海葵。",
    missHint: "海葵仍在輕輕擺動。再選一個明亮時段回來，熟悉的住客不會永遠躲著。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Amphiprion-clarkii.html"
    }
  },
  {
    id: TWO_SPINED_ANGELFISH_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    spotId: STARLIGHT_OBSERVATION_CAPE_ID,
    name: "雙棘甲尻魚",
    english: "Twospined angelfish",
    scientific: "Centropyge bispinosa",
    icon: "◇",
    colors: ["#68436f", "#de7654", "#435f83"],
    timeIds: ["dawn", "day", "dusk"],
    weatherIds: ["sunny", "rain"],
    requiresObservationIds: [CLARKS_ANEMONEFISH_OBSERVATION_ID],
    baseChance: 0.28,
    pityVisits: 3,
    short: "紫橙色的小魚沿著珊瑚陰面輕快啄食，只在轉身時把整片顏色交給光。",
    detail: "雙棘甲尻魚偏好珊瑚生長豐富的潟湖與外礁坡，性情隱密，常單獨或成小群活動。耐心停留，比追趕更容易看清牠。",
    hint: "明亮至黃昏的礁影交界，偶爾會閃過一小片紫橙色。安靜等候比尋找更有用。",
    missHint: "礁影裡留下了一點紫橙反光。觀察次數會被記住，牠不會成為永遠缺少的那一頁。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Centropyge-bispinosa.html"
    }
  }
];

export const WONDERS = [
  {
    id: "green_turtle_breath",
    type: "wonder",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    spotId: STARLIGHT_OBSERVATION_CAPE_ID,
    name: "綠蠵龜的換氣線",
    icon: "◡",
    timeIds: ["dawn", "day"],
    weatherIds: ["sunny"],
    chance: 0.22,
    description: "一枚深色背甲浮到碎光中央，安靜換了一口氣，又把長長水線帶回藍色裡。",
    photoCaption: "沒有追上去。海面替牠保留了一條慢慢合起來的路。"
  },
  {
    id: "reef_squid_lanterns",
    type: "wonder",
    regionId: LUMINOUS_ARCHIPELAGO_ID,
    spotId: STARLIGHT_OBSERVATION_CAPE_ID,
    name: "礁烏賊的星燈",
    icon: "✧",
    timeIds: ["night"],
    weatherIds: ["sunny", "rain"],
    chance: 0.28,
    description: "幾道半透明身影在礁盤外交換微弱色斑，像有人把星光一句一句傳過夜海。",
    photoCaption: "快門沒有聲音，只有幾盞小燈在黑水裡彼此回答。"
  }
];

export function observationSubjectById(subjectId) {
  return OBSERVATION_SUBJECTS.find(subject => subject.id === subjectId);
}

export function wonderById(wonderId) {
  return WONDERS.find(wonder => wonder.id === wonderId);
}

export function getObservationSubjectsForSpot(spotId) {
  return OBSERVATION_SUBJECTS.filter(subject => subject.spotId === spotId);
}

export function getWondersForSpot(spotId) {
  return WONDERS.filter(wonder => wonder.spotId === spotId);
}
