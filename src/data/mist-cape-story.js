import { KELP_PIPEFISH_OBSERVATION_ID, PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID } from "./observations.js";
import { MIST_CAPE_COLD_CURRENT_ID } from "./regions.js";
import { WUHE_ID } from "./residents.js";

const catchTask = (title, description, spotId, goal) => ({
  kind: "catch",
  title,
  description,
  goal,
  condition: {
    eventType: "catch",
    regionIds: [MIST_CAPE_COLD_CURRENT_ID],
    spotIds: [spotId]
  }
});

const observationTask = (title, description, observationId) => ({
  kind: "observation",
  title,
  description,
  goal: 1,
  observationId
});

export const MIST_CAPE_STORY_SCENES = [
  {
    id: "wuhe_bell_before_harbor",
    residentId: WUHE_ID,
    chapter: 1,
    title: "先聽見鐘，才看見港",
    locationName: "聽霧港 · 霧鐘棧橋",
    trigger: { type: "visited-region", regionId: MIST_CAPE_COLD_CURRENT_ID },
    opening: [
      { speaker: "旁白", text: "風棲港以北的暖流線鑽進冷霧後，澄野手繪圖上的藍色筆觸便失去岸形。直到一聲低鐘穿過水氣，聽霧港的短棧橋才慢慢從白色裡浮出。" },
      { speaker: "霧禾", text: "先不用找鐘在哪裡。聽見第二聲，確認它還在同一邊，船就不會離港口更遠。我是霧禾，替這座港敲鐘，也替水溫改變時留下刻度。" },
      { speaker: "旁白", text: "霧禾把澄野的手繪圖壓在木箱上。圖尾的暖流線正對著兩支細長水溫筒：一支纏紅線，一支纏藍線，讀數相差得像來自兩片海。" },
      { speaker: "霧禾", text: "圖沒有畫錯。暖水確實來到這裡，只是岬角的寒流迎面接住了它。請到霧線陸棚親手記錄兩尾普通魚，不必找稀有；我想先知道今天魚群把界線放在哪裡。" },
      { speaker: "霧禾", text: "霧會讓眼睛少看一點，魚線卻會把水往哪裡走交到手上。帶回位置和時刻就好，答案可以慢慢長出來。" }
    ],
    objective: catchTask(
      "在霧線外找到第一道潮界",
      "前往霧線陸棚，親手捕獲 2 條魚。自動釣魚不會代替這段潮界記錄。",
      "fogfront_shelf",
      2
    ),
    completion: [
      { speaker: "旁白", text: "兩筆捕獲落在同一張陸棚圖上，魚線偏移方向卻不相同。霧禾將紅藍水溫筒並排，讓兩道細線在紙上停成一個窄窄的夾角。" },
      { speaker: "霧禾", text: "一尾從較暖的外側來，一尾貼著寒流折回。牠們離得不遠，生活的水卻不同。這就是霧岬的第一個刻度。" },
      { speaker: "旁白", text: "霧沒有散去，海面仍只有灰藍色。可當你再望向同一片水，已能想像看不見的兩種溫度正從船下擦身而過。" },
      { speaker: "霧禾", text: "界線不是牆。它會晃、會變寬，也會讓兩邊的生命在附近交換消息。先記住今天的位置，明天不一樣也沒有關係。" }
    ]
  },
  {
    id: "wuhe_two_buckets_of_sea",
    residentId: WUHE_ID,
    chapter: 2,
    title: "兩桶不同的海",
    locationName: "聽霧港 · 溫度棚",
    opening: [
      { speaker: "旁白", text: "溫度棚外擺著兩只白瓷桶。兩桶海水看起來一樣清澈，一桶邊緣凝著細小水珠，另一桶則讓紅線溫度計緩慢升高。" },
      { speaker: "霧禾", text: "港裡的小孩常問，哪一桶才是霧岬的海。我以前會挑冷的那桶，因為寒流水道聽起來就該有一個乾脆答案。" },
      { speaker: "旁白", text: "霧禾把兩桶水一起倒回港邊。水面只起了兩圈彼此交疊的波紋，再也無法分出原來屬於哪一桶。" },
      { speaker: "霧禾", text: "現在我會說兩桶都是。請分別在霧線陸棚和低語海藻林親手留下一筆捕獲，感受開水潮界與林下背流的差別。" },
      { speaker: "霧禾", text: "不比較魚的價值，只比較牠生活的水。兩邊各一次，就足夠讓這張剖面圖有厚度。" }
    ],
    objective: {
      kind: "catch-contexts",
      title: "比較潮界與海藻林的水",
      description: "在霧線陸棚與低語海藻林各親手捕獲至少 1 條魚。",
      goal: 2,
      uniqueKey: "spotId",
      requiredValues: ["fogfront_shelf", "whispering_kelp_forest"],
      steps: [
        { value: "fogfront_shelf", label: "霧線陸棚留下捕獲" },
        { value: "whispering_kelp_forest", label: "低語海藻林留下捕獲" }
      ],
      condition: {
        eventType: "catch",
        regionIds: [MIST_CAPE_COLD_CURRENT_ID],
        spotIds: ["fogfront_shelf", "whispering_kelp_forest"]
      }
    },
    completion: [
      { speaker: "旁白", text: "陸棚的魚線被橫向潮流推開，海藻林裡的魚線則在葉片背後短暫放鬆。兩筆記錄並排後，同一片冷水第一次出現不同房間。" },
      { speaker: "霧禾", text: "寒流帶來低溫和養分，海藻林再把它拆成林冠、莖間與岩底。魚不是只選冷或暖，也在選流速、光和可以停下來的地方。" },
      { speaker: "旁白", text: "霧禾把兩支溫度計畫成平行線，沒有讓其中一條壓過另一條。圖紙中央留出一片寬緩交界，剛好容得下兩次捕獲。" },
      { speaker: "霧禾", text: "比較不是選出比較好的那一邊。它只是讓差異有地方被看見。往後遇到魚群突然轉向，可以先問問是不是水先換了房間。" }
    ]
  },
  {
    id: "wuhe_holdfast_current",
    residentId: WUHE_ID,
    chapter: 3,
    title: "吸盤記住的流速",
    locationName: "霧鐘觀測崖",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "霧鐘觀測崖下，海藻林冠隨長浪整片傾斜，又在浪後慢慢站回來。霧禾沒有帶釣竿，只帶了一面能俯看岩根的舊觀察鏡。" },
      { speaker: "霧禾", text: "若只看葉片，這裡像什麼都站不穩。可海藻根部有一種很圓的小魚，腹部帶著吸盤，冷流再用力也能替自己留住位置。" },
      { speaker: "旁白", text: "觀察鏡裡只有綠褐葉片、白色岩點和不斷改變方向的水。某些圓影看似礫石，浪來時卻會輕輕擺動胸鰭。" },
      { speaker: "霧禾", text: "請完成太平洋刺圓鰭魚的正式觀察。不要翻動海藻，也不用碰牠；只記下牠附著的位置，以及哪一層水從身邊通過。" },
      { speaker: "霧禾", text: "有些生命用游得很遠理解海，有些生命用留在原處理解海。今天我們學後一種。" }
    ],
    objective: observationTask(
      "看見留在原處的冷水住民",
      "前往霧鐘觀測崖完成正式觀察，記錄太平洋刺圓鰭魚如何附著在海藻根部。",
      PACIFIC_SPINY_LUMPSUCKER_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "一尾圓小魚終於在岩面上轉了半圈。牠沒有被浪帶走，只把腹部吸盤換到另一處，再讓胸鰭順著冷流輕輕開合。" },
      { speaker: "霧禾", text: "看見了嗎？海藻葉片告訴我們浪有多大，牠停住的位置則告訴我們哪裡足夠安穩。兩種記錄缺一種，林子就只剩一半。" },
      { speaker: "旁白", text: "你寫下的不是長度或重量，而是岩根、流向與一次小小換位。太平洋刺圓鰭魚仍留在原處，觀察頁卻完整亮起。" },
      { speaker: "霧禾", text: "穩定不等於沒有變化。牠每一次重新吸附，都是在回應海。能留下來，也是一種很細緻的航行。" }
    ]
  },
  {
    id: "wuhe_bluecold_sounding",
    residentId: WUHE_ID,
    chapter: 4,
    title: "深槽裡的慢水",
    locationName: "聽霧港 · 深度絞盤旁",
    opening: [
      { speaker: "旁白", text: "溫度棚的長紙帶被拉到絞盤旁。表層兩道線仍互相靠近，到了深處，藍線卻突然向下彎去，像寒流把一段夜色收進海底。" },
      { speaker: "霧禾", text: "陸棚讓我們看見交界，海藻林讓我們看見背流；藍寒深槽則保存最慢、最冷的一層。那裡的魚不需要每天跟著表面霧線移動。" },
      { speaker: "旁白", text: "霧禾在遠投輪軸上繫了一段藍布，提醒魚線進入深槽後要給水更多時間。沒有倒數，也沒有必須遇見的大魚。" },
      { speaker: "霧禾", text: "請在藍寒深槽親手捕獲兩尾魚。普通的狹鱈、小鱈或任何合法住民都可以；只要讓深水在剖面圖上留下自己的重量。" },
      { speaker: "霧禾", text: "若今晚只想在港裡聽鐘，也可以明天再去。深槽之所以可靠，正因為它不會因我們晚一點抵達就消失。" }
    ],
    objective: catchTask(
      "替藍寒深槽留下兩筆測深",
      "使用強化遠投竿前往藍寒深槽，親手捕獲 2 條魚。",
      "bluecold_trench",
      2
    ),
    completion: [
      { speaker: "旁白", text: "兩筆深槽記錄都帶著漫長而穩定的拉力。霧禾把深度與水溫對齊，藍線下方終於不再只是空白。" },
      { speaker: "霧禾", text: "表層界線一天能移好幾次，深槽慢得多。這些魚把生活放在慢水裡，所以同一場霧對牠們和陸棚魚的意義完全不同。" },
      { speaker: "旁白", text: "剖面圖現在像一座側躺的海：上層冷暖線彼此擦過，中層海藻林撐起許多房間，最下方則有一道沉靜藍槽。" },
      { speaker: "霧禾", text: "一片海不必只有一個速度。知道哪一層變得快、哪一層仍很慢，才不會把所有魚的轉身都說成同一個原因。" }
    ]
  },
  {
    id: "wuhe_kelp_line_moves",
    residentId: WUHE_ID,
    chapter: 5,
    title: "一段會游動的葉柄",
    locationName: "霧鐘觀測崖 · 林冠側",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "黃昏前，海藻林冠一側仍帶著暖色，另一側已沉進灰藍冷水。兩種水交替時，細長葉柄看似一起傾斜，其中一段卻逆著葉片慢慢前進。" },
      { speaker: "霧禾", text: "那不是葉柄，是海藻海龍。牠沒有太平洋刺圓鰭魚的吸盤，而是把身形變成海藻的一部分，跟著最適合的小水層移動。" },
      { speaker: "旁白", text: "舊觀察頁只留下幾筆不完整線條：偏暖日的林緣、寒流較強時的內側，以及每次都不同的葉片角度。" },
      { speaker: "霧禾", text: "請完成牠的正式觀察。不要分開葉片找牠，讓水色自己改變；牠換到另一根莖時，我們就能看見潮界也在林中移動。" },
      { speaker: "霧禾", text: "我們不是要抓住界線，只要承認它今天停過哪裡。明天它可以自由換一個位置。" }
    ],
    objective: observationTask(
      "等待葉柄自己換到另一層水",
      "在霧鐘觀測崖完成正式觀察，等待海藻海龍自然露出輪廓。",
      KELP_PIPEFISH_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "林冠轉暗時，那段細影離開原來的莖，穿過一小片開水，再直立於另一簇海藻旁。暖色與冷色也在同一刻交換了位置。" },
      { speaker: "霧禾", text: "牠只游了很短一段，卻把兩層水都連起來了。潮界不只存在於外海箭頭，也會穿過一片林、一根莖和一尾小魚的日常。" },
      { speaker: "旁白", text: "你把等待、葉片方向與換位時刻寫進觀察簿。海藻海龍沒有離開林子，卻讓剖面圖最模糊的中層有了清楚筆跡。" },
      { speaker: "霧禾", text: "界線會移動，所以記錄不需要假裝永恆。準確說出『今天在這裡』，已經比畫一條永遠不變的線更可靠。" }
    ]
  },
  {
    id: "wuhe_seasonal_section",
    residentId: WUHE_ID,
    chapter: 6,
    title: "會換季的雙流剖面",
    locationName: "聽霧港 · 霧鐘下",
    opening: [
      { speaker: "旁白", text: "溫度棚的長桌上疊著五層資料：陸棚潮界、海藻林背流、吸附的小魚、深槽慢水，以及一段在冷暖葉片間換位的海藻海龍。" },
      { speaker: "霧禾", text: "我們已經知道暖流和寒流不是互相推開的兩面牆。牠們相遇後，養分、光、流速與棲身位置一起改變，魚才重新排出今天的霧岬。" },
      { speaker: "旁白", text: "剖面圖仍有零散空格。三十四種在地魚至少要確認二十八種，才能避免只用醒目的大型訪客替整片海下結論。" },
      { speaker: "霧禾", text: "完成霧岬八成魚類的主研究吧。二十八種已足夠讓雙流剖面可靠，其餘六種可以在往後自由往返時慢慢遇見。" },
      { speaker: "霧禾", text: "等研究冊亮起，再回到鐘下。我要把今天的剖面和港裡保存多年的季節頁疊在一起，看看這條寒流下一次會往哪裡擺。" }
    ],
    objective: {
      kind: "region-main-research",
      title: "完成霧岬寒流水道主研究",
      description: "親手發現 28／34 種霧岬魚類（八成，無須全收集），並完成前五節後回到霧禾身邊。",
      goal: 28,
      regionId: MIST_CAPE_COLD_CURRENT_ID,
      requirements: [
        {
          id: "mist_story_first_five",
          kind: "completed-scenes",
          label: "霧禾前五節主線",
          sceneIds: [
            "wuhe_bell_before_harbor",
            "wuhe_two_buckets_of_sea",
            "wuhe_holdfast_current",
            "wuhe_bluecold_sounding",
            "wuhe_kelp_line_moves"
          ],
          goal: 5
        },
        {
          id: "mist_region_species",
          kind: "region-species",
          label: "霧岬魚類探索（28／34＝八成）",
          regionId: MIST_CAPE_COLD_CURRENT_ID,
          goal: 28,
          total: 34
        }
      ]
    },
    reward: {
      id: "mist_cape_temperature_section_chart",
      type: "resident-keepsake",
      label: "《霧岬雙流溫度剖面圖》"
    },
    completion: [
      { speaker: "旁白", text: "二十八種魚沿著三層水重新排列。普通魚群填滿陸棚與林間的日常，深槽住民壓住藍色底線，稀有訪客則只在剖面邊緣留下不必追趕的記號。" },
      { speaker: "霧禾", text: "這才像霧岬。不是冷流打敗暖流，也不是哪一邊比較珍貴；是兩種水相遇後，生命各自找到可以呼吸、停留和經過的位置。" },
      { speaker: "旁白", text: "霧禾把完成的剖面圖裝進船屋航圖桌的黃銅框。接著展開多年舊頁：同一條藍線會隨季節往返，而每次大幅移動以前，遠方風向總先改變。" },
      { speaker: "霧禾", text: "寒流不是永遠待在今天的位置。它會跟著季節和長風收放；再往前，那些風會主宰整片群島的生活。這不是警告，只是下一片海的自然節奏。" },
      { speaker: "霧禾", text: "想出發時再沿季節最清楚的那一頁走。霧鐘不會追著船響；你已經知道，即使看不見岸，也能從水、魚和風裡重新找到方向。" }
    ]
  }
];
