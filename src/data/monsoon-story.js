import { BARRED_MUDSKIPPER_OBSERVATION_ID, YELLOW_SEAHORSE_OBSERVATION_ID } from "./observations.js";
import { MONSOON_ARCHIPELAGO_ID } from "./regions.js";
import { JICEN_ID } from "./residents.js";
import { MONSOON_TO_GRAYCROWN_ROUTE_ID } from "./routes.js";

const catchTask = (title, description, spotId, goal, extraCondition = {}) => ({
  kind: "catch",
  title,
  description,
  goal,
  condition: {
    eventType: "catch",
    regionIds: [MONSOON_ARCHIPELAGO_ID],
    spotIds: [spotId],
    ...extraCondition
  }
});

const observationTask = (title, description, observationId) => ({
  kind: "observation",
  title,
  description,
  goal: 1,
  observationId
});

export const MONSOON_STORY_SCENES = [
  {
    id: "jicen_longwind_arrival",
    residentId: JICEN_ID,
    chapter: 1,
    title: "長風把寒舌送到港外",
    locationName: "回風港 · 風候船屋",
    trigger: { type: "visited-region", regionId: MONSOON_ARCHIPELAGO_ID },
    opening: [
      { speaker: "旁白", text: "霧禾的《霧岬雙流溫度剖面圖》攤在船屋長桌上，多年季節頁被四色風繩壓住。藍色寒流線一路伸到群島外側，恰好與今日長風同向。" },
      { speaker: "季岑", text: "圖上的水沒有迷路。風把表層推向一邊，寒舌就跟著擺；你順著它來，也順著長風找到了回風港。我是季岑，留在這裡替每種風找泊位。" },
      { speaker: "旁白", text: "港內水面平緩，港外水道卻排著斜斜白沫。同一陣風被島脊拆成兩種海況，繫纜柱旁的石刻也留下兩組浪痕。" },
      { speaker: "季岑", text: "先到迎風白沫水道親手捕獲兩尾普通魚。不必追大魚，只要感受魚線被浪推向哪一側，再帶著方向回港。" },
      { speaker: "季岑", text: "這裡沒有錯過風季的期限。今天累了就明天去；風換了方向，我們正好多讀一種排列。" }
    ],
    objective: catchTask(
      "讀第一道迎風浪向",
      "前往迎風白沫水道，親手捕獲 2 條魚；自動釣魚不會代替這段風向記錄。",
      "windward_whitecap_passage",
      2
    ),
    completion: [
      { speaker: "旁白", text: "兩次魚線都先向島內偏，再被回浪拉回外側。季岑把方向畫在霧禾的季節頁邊緣，沒有擦掉原來的寒流線。" },
      { speaker: "季岑", text: "風先安排浪，浪再安排魚群通過水道的角度。你釣到的不只是魚，也是今天外水進島的方式。" },
      { speaker: "旁白", text: "船屋外的染色風繩與海面白沫同時斜向西北。圖、線與手中的拉力第一次指向相同方向。" },
      { speaker: "季岑", text: "霧岬讓你讀兩種水相遇；群島會讓你看見同一片水被風重新擺放。先把今天記成今天，不必要求明天照抄。" }
    ]
  },
  {
    id: "jicen_two_sides_one_island",
    residentId: JICEN_ID,
    chapter: 2,
    title: "一座島的兩面水",
    locationName: "回風港 · 島脊風繩架",
    opening: [
      { speaker: "旁白", text: "季岑把兩條相同長度的風繩掛在島脊模型兩側。迎風側的繩結不斷敲桌，背風側只在末端輕輕擺動。" },
      { speaker: "季岑", text: "外海沒有突然少一陣風，是島把它接住了。迎風面承受長浪，背風面因此留下一片海草能站穩的淺水。" },
      { speaker: "旁白", text: "模型下方畫著兩列魚影：一列流線修長，一列貼著草葉與沙地。牠們距離很近，選擇的遮蔽卻完全不同。" },
      { speaker: "季岑", text: "請在迎風白沫水道與背風海草灣各親手捕獲一尾魚。不是比較哪裡比較好，只要讓手記住兩種水的阻力。" },
      { speaker: "季岑", text: "順序自由，時段也自由。島脊每天都在，這堂課不會關門。" }
    ],
    objective: {
      kind: "catch-contexts",
      title: "比較迎風與背風兩側",
      description: "在迎風白沫水道與背風海草灣各親手捕獲至少 1 條魚。",
      goal: 2,
      uniqueKey: "spotId",
      requiredValues: ["windward_whitecap_passage", "leeward_seagrass_bay"],
      steps: [
        { value: "windward_whitecap_passage", label: "迎風白沫水道留下捕獲" },
        { value: "leeward_seagrass_bay", label: "背風海草灣留下捕獲" }
      ],
      condition: {
        eventType: "catch",
        regionIds: [MONSOON_ARCHIPELAGO_ID],
        spotIds: ["windward_whitecap_passage", "leeward_seagrass_bay"]
      }
    },
    completion: [
      { speaker: "旁白", text: "迎風魚線持續斜拉，背風魚線則在海草上方一收一放。季岑把兩段線綁在同一枚島形木牌上。" },
      { speaker: "季岑", text: "同一座島沒有單一海況。島脊替一面承受浪，也替另一面製造遮蔽；魚群只是各自住進合適的房間。" },
      { speaker: "旁白", text: "背風灣水色更清，草葉的影子能完整落到沙底；迎風水道則由白沫不斷切碎反光。" },
      { speaker: "季岑", text: "往後風向轉過島角，兩邊的角色也可能交換。地名不變，『迎風』和『背風』卻是每天重新回答的問題。" }
    ]
  },
  {
    id: "jicen_mangrove_airline",
    residentId: JICEN_ID,
    chapter: 3,
    title: "紅樹根間的空氣航線",
    locationName: "風候石觀察台 · 紅樹側",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "雨脈紅樹岸退潮後，泥面浮出一排細小水孔。季岑把望鏡架低，讓鏡面與泥灘幾乎平行。" },
      { speaker: "季岑", text: "淡水來時，有些魚退向鹽度穩定的外側；有些魚卻留在泥與水之間。那尾彈塗魚把岸也當成一條航線。" },
      { speaker: "旁白", text: "一小段灰褐影子用胸鰭撐起身體，離開水窪後仍保持濕潤。紅樹根的陰影替牠遮住日光和鳥的視線。" },
      { speaker: "季岑", text: "請完成大彈塗魚的正式觀察。不要踏進泥灘，只記牠如何在水孔、根影與濕泥之間換位。" },
      { speaker: "季岑", text: "我們不需要追上牠。安靜坐著，牠自然會把一條不靠船的潮路畫出來。" }
    ],
    objective: observationTask(
      "觀察紅樹岸上的潮路",
      "前往風候石觀察台，完成大彈塗魚如何利用濕泥與紅樹根影的正式觀察。",
      BARRED_MUDSKIPPER_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "彈塗魚從水孔躍到根影，再停在一塊仍帶雨水的泥面。牠沒有離開潮間帶，只把水與岸連成同一段生活範圍。" },
      { speaker: "季岑", text: "紅樹林不只是魚躲進去的水下根系。潮退後留下的濕度、陰影和泥孔，也都是牠們能使用的空間。" },
      { speaker: "旁白", text: "觀察頁添上一條彎曲細線，從半鹹水窪跨過濕泥，停在呼吸根之間。它與海圖航線不同，卻同樣準確。" },
      { speaker: "季岑", text: "風改變水位和乾燥速度，雨又補回濕度。彈塗魚沒有等待環境固定，而是熟悉每一次轉換。" }
    ]
  },
  {
    id: "jicen_freshwater_plume",
    residentId: JICEN_ID,
    chapter: 4,
    title: "雨把海染深一層",
    locationName: "回風港 · 鹽度杯架",
    opening: [
      { speaker: "旁白", text: "一場雨後，季岑把三只黃銅杯從紅樹岸排到港外。越靠近島坡的杯子，鹽味越淡，水色卻因泥土與葉片碎屑變得更深。" },
      { speaker: "季岑", text: "雨沒有把海變髒。它把淡水、細泥和陸地養分帶進來，畫成會慢慢散開的羽流。魚會依能承受的鹽度重新站位。" },
      { speaker: "旁白", text: "航圖上的羽流沒有固定邊框，只畫了幾道逐漸變淡的褐綠色。晴天頁與雨天頁疊在一起時，邊界相差一整個紅樹灣。" },
      { speaker: "季岑", text: "下一次下雨時，到雨脈紅樹岸親手捕獲兩尾魚。普通河口魚就好；我們要記牠們停在羽流內側還是外側。" },
      { speaker: "季岑", text: "沒有倒數。若天正晴，就先去釣別處、睡到下一個時段，或改天再來。雨會依原本的海況輪替回來。" }
    ],
    objective: catchTask(
      "在雨水羽流留下兩筆鹽度位置",
      "雨天前往雨脈紅樹岸，親手捕獲 2 條魚；任務不會逾期，也沒有失敗懲罰。",
      "rainmangrove_estuary",
      2,
      { weatherIds: ["rain"] }
    ),
    completion: [
      { speaker: "旁白", text: "兩筆捕獲分別落在深色羽流邊緣與較清的外側。季岑以鹽度杯讀數標上淡淡刻度，沒有把水色直接當成鹽度答案。" },
      { speaker: "季岑", text: "看見顏色能提醒我們淡水可能來過，真正的鹽度仍要和位置、雨量與魚種一起讀。沒有一個線索能獨自代表整片海。" },
      { speaker: "旁白", text: "紅樹根下的魚影比晴日更靠外，能忍受半鹹水的魚則沿羽流內側覓食。同一個釣點像把房間重新排過。" },
      { speaker: "季岑", text: "季風不是只帶大浪。它也透過雨改變鹽度、能見度和食物來源；魚群換位置，是在讀一張我們剛學會看的圖。" }
    ]
  },
  {
    id: "jicen_seagrass_cradle",
    residentId: JICEN_ID,
    chapter: 5,
    title: "草葉替小魚收住風",
    locationName: "風候石觀察台 · 海草側",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "背風海草灣的水面像一層薄玻璃，底下草葉卻仍隨較慢的湧浪俯仰。一段黃色捲尾纏在葉柄上，停得比影子更安靜。" },
      { speaker: "季岑", text: "那是庫達海馬。島脊先削弱長風，草床再把剩下的水流拆細，牠才有地方用尾巴把自己留住。" },
      { speaker: "旁白", text: "望鏡裡的海馬輪廓會被草葉一再遮住。牠沒有逃走，只隨同一簇葉片轉向背光的一側。" },
      { speaker: "季岑", text: "請完成庫達海馬的正式觀察。不要撥草，也不要等牠做罕見動作；記下遮蔽如何讓小範圍變得可居住。" },
      { speaker: "季岑", text: "看不見時就多坐一會兒。這段等待不是考驗，是讓草床保持原樣的禮貌。" }
    ],
    objective: observationTask(
      "看見海草床收住的慢水",
      "在風候石觀察台完成庫達海馬的正式觀察，記錄捲尾、草葉與背風遮蔽。",
      YELLOW_SEAHORSE_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "海馬鬆開一根葉柄，順慢流漂過半個身長，又將捲尾纏到下一根草葉。短短換位把兩層遮蔽都畫了出來。" },
      { speaker: "季岑", text: "島替海草擋風，海草替海馬拆流。遮蔽不是沒有水動，而是把力量改成生命能使用的尺度。" },
      { speaker: "旁白", text: "觀察頁留下尾巴纏繞的方向、草葉角度與水面反光。那尾小魚仍藏在原灣，頁面卻讓背風二字有了完整內容。" },
      { speaker: "季岑", text: "現在你讀得出浪向、鹽度、水色和遮蔽，也看得出魚為何換位置。下一步不是把每尾魚抓齊，而是讓足夠多的日常魚替這些線索互相作證。" }
    ]
  },
  {
    id: "jicen_windstone_route_rubbing",
    residentId: JICEN_ID,
    chapter: 6,
    title: "風候石上的下一道長浪",
    locationName: "回風港 · 風候石與航圖桌",
    opening: [
      { speaker: "旁白", text: "航圖桌上排著前五節記錄：迎風浪向、島脊兩面、紅樹泥路、雨水羽流與海草慢水。每一頁都是同一座群島，卻沒有兩頁完全相同。" },
      { speaker: "季岑", text: "我們已完成前五節五之五。接著要讓三十七種在地魚裡至少二十六種出現在研究冊，才不會只用幾尾醒目魚替整個季風下結論。" },
      { speaker: "旁白", text: "研究冊明列二十六／三十七為七成主研究門檻。剩下十一種與三十七／三十七完整收藏都保持自願，不影響航線。" },
      { speaker: "季岑", text: "達到前五節五／五與魚類探索二十六／三十七後，仍要回來正式交給我。只有我們一起把資料拓上風候石，下一張航線圖才會完成。" },
      { speaker: "季岑", text: "不用趕，也沒有失敗。等研究冊亮起再回港；石頭保存過很多季風，願意再替我們等一頁。" }
    ],
    objective: {
      kind: "region-main-research",
      title: "完成季風群島主研究並回港交付",
      description: "完成前五節 5／5，親手發現 26／37 種季風群島魚類（七成）；達標後回到季岑身邊正式完成。",
      goal: 26,
      regionId: MONSOON_ARCHIPELAGO_ID,
      requirements: [
        {
          id: "monsoon_story_first_five",
          kind: "completed-scenes",
          label: "季岑前五節主線（5／5）",
          sceneIds: [
            "jicen_longwind_arrival",
            "jicen_two_sides_one_island",
            "jicen_mangrove_airline",
            "jicen_freshwater_plume",
            "jicen_seagrass_cradle"
          ],
          goal: 5
        },
        {
          id: "monsoon_region_species",
          kind: "region-species",
          label: "季風群島魚類探索（26／37＝七成）",
          regionId: MONSOON_ARCHIPELAGO_ID,
          goal: 26,
          total: 37
        }
      ]
    },
    reward: {
      id: "monsoon_windstone_route_rubbing",
      type: "route-chart",
      routeId: MONSOON_TO_GRAYCROWN_ROUTE_ID,
      label: "《風候石航線拓印》與灰冠長浪航線"
    },
    completion: [
      { speaker: "旁白", text: "二十六種魚被放回三片水域：迎風群游魚順浪排成斜線，背風海草住民貼著遮蔽，紅樹河口魚則沿雨水鹽度漸層重新分布。" },
      { speaker: "季岑", text: "這才是季風群島。地方沒有換掉，風與季節卻讓浪、鹽度、顏色、遮蔽和魚的位置一同重排；每一種排列都是真實的家。" },
      { speaker: "旁白", text: "季岑將前五頁與二十六種魚的索引壓在風候石上，用灰藍石粉拓出浪痕。拓印被裝進船屋航圖桌，也在港口石架留下永久副本。" },
      { speaker: "季岑", text: "最外側這道痕不是今天的短浪。它經過許多季風，一直磨向西北，把遠方岸石磨成圓滑灰冠。風留下石，石也替船留下航線。" },
      { speaker: "旁白", text: "灰冠長浪航線在海圖上顯出輪廓，標記第五章「灰冠石岸」仍待測繪。你已正式取得航線拓印；在目的地開放前，三十七／三十七仍只是可自由完成的收藏。" },
      { speaker: "季岑", text: "想再看另一季的群島就回來。等灰冠泊地完成，沿這道被風浪磨出的線走；回風港與這張拓印都會留在原處。" }
    ]
  }
];
