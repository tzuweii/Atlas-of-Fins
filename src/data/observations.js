import {
  LUMINOUS_ARCHIPELAGO_ID, MIST_CAPE_COLD_CURRENT_ID, MONSOON_ARCHIPELAGO_ID
} from "./regions.js";

export const STARLIGHT_OBSERVATION_CAPE_ID = "starlight_observation_cape";
export const CLARKS_ANEMONEFISH_OBSERVATION_ID = "clarks_anemonefish";
export const TWO_SPINED_ANGELFISH_OBSERVATION_ID = "twospined_angelfish";
export const MISTBELL_OVERLOOK_ID = "mistbell_overlook";
export const PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID = "pacific_spiny_lumpsucker";
export const KELP_PIPEFISH_OBSERVATION_ID = "kelp_pipefish";
export const SEASONSTONE_WATCH_ID = "seasonstone_watch";
export const BARRED_MUDSKIPPER_OBSERVATION_ID = "barred_mudskipper";
export const YELLOW_SEAHORSE_OBSERVATION_ID = "yellow_seahorse";

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
      url: "https://www.fishbase.se/summary/Amphiprion-clarkii.html",
      checkedAt: "2026-08-04",
      note: "依海葵共生與礁區棲地資料，轉為原地等待、不帶走魚的正式觀察。"
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
      url: "https://www.fishbase.se/summary/Centropyge-bispinosa.html",
      checkedAt: "2026-08-04",
      note: "依珊瑚豐富礁區與隱蔽行為資料，轉為具累積保底的礁影正式觀察。"
    }
  },
  {
    id: PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    spotId: MISTBELL_OVERLOOK_ID,
    name: "太平洋刺圓鰭魚",
    english: "Pacific spiny lumpsucker",
    scientific: "Eumicrotremus orbis",
    icon: "●",
    colors: ["#8aa179", "#d47c55", "#5c6670"],
    timeIds: ["dawn", "day"],
    weatherIds: ["sunny", "rain"],
    baseChance: 0.52,
    pityVisits: 2,
    short: "圓小身體用腹部吸盤貼在海藻與岩面，冷流推過時只輕輕擺動魚鰭。",
    detail: "太平洋刺獅子魚生活在北太平洋冷水沿岸，腹鰭形成吸盤，能附著在岩石與海藻上。看見牠停穩的位置，比追著牠移動更能讀懂林中的流速。",
    hint: "清晨或白天，留意海藻根部那些沒有被冷流帶走的圓形小影。",
    missHint: "海藻葉片已經轉向，根部仍很安靜。換一個明亮時段再來，吸附的小魚不會永遠藏住。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Eumicrotremus-orbis.html",
      checkedAt: "2026-07-28",
      note: "依冷水岩礁與腹部吸盤資料，轉為海藻根部流速的非捕獲觀察。"
    }
  },
  {
    id: KELP_PIPEFISH_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    spotId: MISTBELL_OVERLOOK_ID,
    name: "海藻海龍",
    english: "Kelp pipefish",
    scientific: "Syngnathus californiensis",
    icon: "⌇",
    colors: ["#9da868", "#63755e", "#d3c89a"],
    timeIds: ["day", "dusk"],
    weatherIds: ["sunny", "rain"],
    requiresObservationIds: [PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID],
    baseChance: 0.3,
    pityVisits: 3,
    short: "細長身影順著海藻莖保持直立，葉片換邊時才慢慢游向另一層水。",
    detail: "海藻海龍在海藻床與近岸植被間活動，以管狀吻吸取小型甲殼類。牠會利用細長輪廓融入葉片，讓冷暖水帶的微小移動變得可見。",
    hint: "白日至黃昏，觀察海藻莖與開水交界；有一段看似葉柄的細影會自己換位置。",
    missHint: "剛才有一根細莖逆著葉片移動了一點。等待下一次水色交替，牠會留下更完整的輪廓。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Syngnathus-californiensis.html",
      checkedAt: "2026-07-28",
      note: "依海藻植被棲地與管狀吻資料，轉為冷暖林層換位的非捕獲觀察。"
    }
  },
  {
    id: BARRED_MUDSKIPPER_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: MONSOON_ARCHIPELAGO_ID,
    spotId: SEASONSTONE_WATCH_ID,
    name: "大彈塗魚",
    english: "Barred Mudskipper",
    scientific: "Periophthalmus argentilineatus",
    icon: "⌁",
    colors: ["#88765c", "#4d6358", "#d2bb7a"],
    timeIds: ["dawn", "day", "dusk"],
    weatherIds: ["sunny", "rain"],
    baseChance: 0.54,
    pityVisits: 2,
    short: "灰褐小魚用胸鰭撐過濕泥，在紅樹水孔與根影之間走出一條岸上潮路。",
    detail: "大彈塗魚生活於熱帶紅樹林與泥質潮間帶，能在保持濕潤時離水活動。觀察牠如何使用泥孔、陰影與潮水，比追逐一次跳躍更重要。",
    hint: "清晨至黃昏，留意紅樹根旁仍濕潤的泥面；有一小段影子會自己離開水孔。",
    missHint: "泥面只留下幾枚新鮮胸鰭印。觀察次數會被記住，牠不會永遠躲在水孔裡。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Periophthalmus-argentilineatus.html",
      checkedAt: "2026-08-04",
      note: "依沿岸、河口與紅樹潮間帶棲地資料，轉為不進入泥灘的遠距正式觀察。"
    }
  },
  {
    id: YELLOW_SEAHORSE_OBSERVATION_ID,
    type: "catalog-fish",
    regionId: MONSOON_ARCHIPELAGO_ID,
    spotId: SEASONSTONE_WATCH_ID,
    name: "庫達海馬",
    english: "Yellow Seahorse",
    scientific: "Hippocampus kuda",
    icon: "∫",
    colors: ["#d3aa4d", "#8e7e45", "#486b61"],
    timeIds: ["dawn", "day", "dusk"],
    weatherIds: ["sunny", "rain"],
    requiresObservationIds: [BARRED_MUDSKIPPER_OBSERVATION_ID],
    baseChance: 0.3,
    pityVisits: 3,
    short: "黃色捲尾纏住背風海草，慢流推過時只換到相鄰一根葉柄。",
    detail: "庫達海馬利用海草床、紅樹與受遮蔽淺水，以捲尾固定身體並用管狀吻吸取小型獵物。牠的短距離換位能顯出背風遮蔽如何拆細水流。",
    hint: "明亮至黃昏，觀察背風草床葉柄；有一段捲曲影子會隨草葉一起轉向。",
    missHint: "草葉剛剛比水流慢了一拍。保持距離再來，捲尾住客會在累積觀察後自然露出輪廓。",
    ecologySource: {
      label: "FishBase 物種摘要",
      url: "https://www.fishbase.se/summary/Hippocampus-kuda.html",
      checkedAt: "2026-08-04",
      note: "依海草、紅樹與受遮蔽沿岸棲地資料，轉為背風海草床的非捕獲正式觀察。"
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
  },
  {
    id: "sea_otter_kelp_raft",
    type: "wonder",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    spotId: MISTBELL_OVERLOOK_ID,
    name: "海獺的林冠小筏",
    icon: "♒",
    timeIds: ["dawn", "day"],
    weatherIds: ["sunny"],
    chance: 0.2,
    description: "一隻海獺把自己纏進海藻林冠，仰躺著隨小浪升降，沒有被霧推離休息的位置。",
    photoCaption: "海藻不是繩索，而是一張讓休息也能留在旅程裡的小筏。"
  },
  {
    id: "gray_whale_fog_breath",
    type: "wonder",
    regionId: MIST_CAPE_COLD_CURRENT_ID,
    spotId: MISTBELL_OVERLOOK_ID,
    name: "灰鯨穿霧的一口氣",
    icon: "⌁",
    timeIds: ["dawn", "dusk"],
    weatherIds: ["sunny", "rain"],
    chance: 0.18,
    description: "遠處先傳來低低的呼吸聲，一縷白氣才從霧後升起，沿著岬角慢慢向北移動。",
    photoCaption: "沒有追上去；鐘聲與下一口呼吸已替牠標出安全的方向。"
  },
  {
    id: "dugong_seagrass_breath",
    type: "wonder",
    regionId: MONSOON_ARCHIPELAGO_ID,
    spotId: SEASONSTONE_WATCH_ID,
    name: "儒艮的草床換氣線",
    icon: "◡",
    timeIds: ["dawn", "day"],
    weatherIds: ["sunny", "rain"],
    chance: 0.18,
    description: "一枚圓鈍鼻端在背風灣換氣，寬厚身影沿海草床外緣慢慢離開，沒有改變原本的覓食方向。",
    photoCaption: "沒有跟船追近；平靜水面替草床住客保留了一道逐漸合起的呼吸線。"
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
