export const JOURNAL_TEMPLATE_VERSION = 3;

export const JOURNAL_REGION_CATEGORIES = Object.freeze([
  { id: "sleeping_tide_bay", name: "眠潮灣", chapter: 1, status: "available" },
  { id: "luminous_archipelago", name: "琉光群島", chapter: 2, status: "available" },
  { id: "mist_cape_cold_current", name: "霧岬寒流水道", chapter: 3, status: "available" },
  { id: "monsoon_archipelago", name: "季風群島", chapter: 4, status: "planned" },
  { id: "graycrown_stone_coast", name: "灰冠石岸", chapter: 5, status: "planned" },
  { id: "starice_southern_sea", name: "星冰南方海", chapter: 6, status: "planned" }
]);

export const JOURNAL_CATEGORIES = Object.freeze([
  { id: "today", name: "今日潮記", kind: "daily", description: "只保留今天，自動寫成一篇與進度無關的海上短文。" },
  { id: "rare_fish", name: "魚類圖鑑", kind: "fish", description: "第一次親手釣到稀有魚時，收錄固定的相遇頁。" },
  { id: "sea_events", name: "特殊海況", kind: "events", description: "首次完成選填海域事件時，保存一篇不影響主線的海況紀錄。" },
  ...JOURNAL_REGION_CATEGORIES.map(region => ({
    id: region.id,
    name: region.name,
    kind: "story",
    chapter: region.chapter,
    status: region.status,
    description: region.status === "available" ? `主線第 ${region.chapter} 章` : "故事將在海域設計時完成"
  }))
]);

export const JOURNAL_EVENT_TEMPLATES = Object.freeze([
  { id: "rare_fish_encounter", eventType: "fish.discovered", entryType: "fish", permanent: true },
  { id: "region_story_event", eventType: "region.event.progress", entryType: "event", permanent: true },
  { id: "resident_story", eventType: "resident.story.completed", entryType: "story", permanent: true }
]);

export const FISH_ENCOUNTER_LINES = Object.freeze({
  dawn: ["晨光剛落上海面，我在{spotName}第一次認出{fishName}。", "霧色尚未散盡，{fishName}把名字留進我的圖鑑。"],
  day: ["日光照清水紋時，我第一次遇見{fishName}。", "明亮的潮水裡，{fishName}成了今天新認識的身影。"],
  dusk: ["晚霞貼近海面，我在回光裡第一次認出{fishName}。", "天色慢慢轉柔時，{fishName}游進了圖鑑的新一頁。"],
  night: ["船燈照到水面，我第一次看清{fishName}的輪廓。", "星光落在潮線上，{fishName}安靜地有了名字。"]
});

// 受公共領域海洋文學的航行、測候與自然觀察精神啟發，文字皆為本作重新撰寫的原創短文。
export const DAILY_TIDE_ESSAYS = Object.freeze([
  {
    id: "soundings",
    title: "把深度交還給鉛錘",
    body: [
      "很早以前，船員會把繫著鉛錘的長繩放進海裡。繩上的記號一節一節沉下去，直到重量碰到海床，他們才知道船下藏著多少看不見的水。",
      "測量並沒有讓海變小，只是讓未知有了一個可以安心靠近的刻度。今天的船也沿著自己的刻度緩緩前進，不必急著知道遠方全部的深度。"
    ],
    closing: "有些答案沉在水下；知道繩子仍握在手裡，就已足夠。"
  },
  {
    id: "lantern-watch",
    title: "守夜燈沒有追趕任何人",
    body: [
      "夜航的燈並不是為了照亮整片海。它只照見近處的甲板、繩結與浪尖，讓值夜的人確認船仍在呼吸。更遠的黑暗，則交給星位和潮聲慢慢辨認。",
      "船屋裡留一盞小燈也是如此。它不催促誰完成旅程，只替尚未讀完的頁面保留一圈溫暖。"
    ],
    closing: "遠方可以繼續黑著，近處已有足夠的光。"
  },
  {
    id: "driftwood",
    title: "漂流木記得的方向",
    body: [
      "一段木頭離開岸邊後，不會留下航海圖。它隨風偏轉，被浪推遠，又在另一處沙灘安靜停下。附著其上的小生物，卻把整段旅程當成了移動的島。",
      "海上的方向不只屬於目的地。有時候，承接、漂流與靠岸，本身就是一條完整的路。"
    ],
    closing: "不是所有航線都需要筆直，抵達也不一定伴隨鐘聲。"
  },
  {
    id: "fog-bell",
    title: "霧裡先傳來聲音",
    body: [
      "濃霧把岸線藏起來時，水手常先聽見浮標鐘，再看見港口。聲音穿過看不見的水氣，一次只說明一件事：附近有可以辨認的位置。",
      "看不清下一段路並不等於迷失。只要願意停一下，風、浪與遠處規律的回聲都會慢慢把方向送回來。"
    ],
    closing: "霧沒有拿走世界，只把它改成需要傾聽的樣子。"
  },
  {
    id: "tide-table",
    title: "潮水從不重複同一條岸線",
    body: [
      "潮汐表能預告海水何時升降，卻無法畫出每一道浪會停在哪顆石頭旁。月亮給出長久的節奏，岸邊則每天完成不同的細節。",
      "規律與變化並不互相衝突。正因為潮水會再回來，今天留在沙上的紋路才可以放心只屬於今天。"
    ],
    closing: "明日仍會漲潮，但不會覆寫今天看見的光。"
  },
  {
    id: "seabird-rest",
    title: "海鳥也會把翅膀收起來",
    body: [
      "長途飛行的海鳥會利用風抬起身體，也會在浮木、礁石或安靜水面上停留。休息不是離開航程，而是航程本來就有的一部分。",
      "船停泊時仍在輕輕移動。纜繩承接浪的力量，木板發出細小聲響，所有暫停都在替下一次出發整理呼吸。"
    ],
    closing: "把翅膀收好，也是一種知道方向的方式。"
  },
  {
    id: "current-letter",
    title: "洋流寄來一封沒有署名的信",
    body: [
      "暖水與冷水在很遠的地方啟程，帶著鹽分、浮游生物和季節的氣息穿過海面。等它們抵達船邊，原來的岸早已看不見。",
      "我們讀洋流，常常是從一尾魚、一片漂葉或突然改變的水色開始。海沒有署名，仍把沿途的消息完整送達。"
    ],
    closing: "有些遠方不必親自抵達，也會先在水裡與我們相遇。"
  },
  {
    id: "stars-and-compass",
    title: "羅盤之外還有星星",
    body: [
      "羅盤讓船知道北方，星星則讓漫長的夜晚多出可以確認的位置。航海者並不要求天空替自己決定路線，只從穩定的光裡借一點方向。",
      "當雲層遮住星位，船仍能放慢速度，等待熟悉的亮點重新出現。等待不是空白，而是導航的一部分。"
    ],
    closing: "方向不必一直被看見，只要它仍能被重新找到。"
  },
  {
    id: "quiet-harbor",
    title: "港口把浪分成較小的句子",
    body: [
      "防波堤沒有阻止海，只把長浪拆成較短的起伏。船進港後仍會搖晃，只是每一次升降都變得容易理解。",
      "一個可以回去的地方，也不需要讓世界停止。它只要替疲倦留下較平緩的水面，讓繩索、杯子與未完成的筆記各自回到位置。"
    ],
    closing: "家不是沒有浪，而是浪來時仍知道東西放在哪裡。"
  },
  {
    id: "whale-breath",
    title: "先看見一口呼吸",
    body: [
      "遼闊海面上，巨大的身影往往先以一口白色水氣被發現。呼吸短暫升起，很快散入風裡，卻足以說明水下有生命正依自己的節奏前進。",
      "許多重要的相遇都是這樣：不必追趕，也不必完整擁有。看見一次呼吸，知道牠曾平安經過，頁面便已經足夠。"
    ],
    closing: "海面恢復平靜後，相遇並沒有因此消失。"
  },
  {
    id: "rope-knots",
    title: "繩結保存的是手的記憶",
    body: [
      "常用的繩結不靠華麗形狀工作。它們在需要時收緊，在卸下力量後願意鬆開，讓一條繩子可以一次又一次重新使用。",
      "船上的熟練，也不是把每件事變得複雜。真正可靠的動作通常很少，卻能在風向改變時，仍替人保留從容。"
    ],
    closing: "簡單不是少做一步，而是每一步都知道自己為何存在。"
  },
  {
    id: "chart-margin",
    title: "海圖邊緣留著尚未命名的水",
    body: [
      "舊海圖最動人的地方，有時不是畫得最密的港灣，而是邊緣仍然空著的海。那片空白沒有承諾寶藏，只誠實表示：航線還沒有走到那裡。",
      "未完成不需要被急著填滿。只要已走過的地方清楚可靠，空白就能繼續作為邀請，而不是欠下的工作。"
    ],
    closing: "讓未知保留寬度，下一次出航才有地方展開。"
  }
]);

export const RARE_FISH_JOURNAL_ENTRIES = Object.freeze([
  { fishId: "mahi", title: "金藍掠過深水", body: ["鬼頭刀第一次靠近船邊時，金色與藍色沿著身側迅速流轉。牠沒有在水面停留太久，只用一次有力轉身，讓晴朗深水忽然顯得更寬。"], closing: "有些顏色只有在高速離去時，才會被完整看見。" },
  { fishId: "flyingfish", title: "水面短暫長出翅膀", body: ["飛魚受驚躍出水面，寬大的胸鰭在晨昏薄光裡展開。那不是離開海，而是借一小段空氣，把前方的距離安靜地滑過去。"], closing: "浪尖合上以後，天空仍記得那道銀色弧線。" },
  { fishId: "ribbon", title: "雨夜裡的一段銀紗", body: ["月紗皇帶魚從細雨深處浮起，緋紅長鰭沿著銀白身體緩緩擺動。傳說在真正被看見時沒有喧鬧，只像月色在水下多停留了一會兒。"], closing: "名字很長，牠經過船燈的時間卻很輕。" },
  { fishId: "mirror_butterflyfish", title: "珊瑚間的小小鏡面", body: ["鏡斑蝴蝶魚在礁影間轉身，金黃身側與墨色圓斑一明一暗。牠沒有映出船的模樣，只把珊瑚庭的光折回水裡。"], closing: "海中的鏡子不保存影像，只把光送回原處。" },
  { fishId: "greater_amberjack", title: "晨光下的琥珀線", body: ["紅甘從深水礁坡靠近，厚實銀身中央穿過一條安靜的琥珀色。牠的力量沒有急著爆發，而是持續牽引，像整片深水都在緩慢移動。"], closing: "真正強健的旅者，很少需要向浪證明自己。" },
  { fishId: "bluespotted_cornetfish", title: "暖流裡的一支長笛", body: ["藍斑煙管魚細長得近乎一條水中的線，尾端絲狀延伸順著暖流擺動。牠靠近時沒有驚動魚群，像一段尚未吹響的旋律穿過藍渠。"], closing: "水流替牠保留了聲音之前的安靜。" },
  { fishId: "giant_trevally", title: "浪忽然向前一步", body: ["浪人鰺從暖流深處穩穩逼近，短促加速讓船邊的水同時改變方向。牠獨自穿過礁坡與水道，身後沒有隊伍，只有逐漸平復的波紋。"], closing: "有些身影不留下路標，海水本身就是牠的足跡。" },
  { fishId: "dogtooth_tuna", title: "藍渠深處的銀色力量", body: ["裸狐鰹從暖流深處抬升時，厚實身形幾乎沒有多餘擺動。牠只在轉向的一瞬間拉出一道沉重弧線，讓魚線、船身與整片藍渠一起記住那股力量。"], closing: "真正迅速的身影，總把大部分速度留在看不見的水裡。" },
  { fishId: "scrawled_filefish", title: "雨水寫過的魚身", body: ["長尾革單棘魨穿過珊瑚庭外的雨幕，青灰魚身浮出一行行藍色曲線。那些紋路不像地圖指向某處，更像海在牠身上留下還沒說完的筆記。"], closing: "雨停之後，潮水仍把那一頁緩慢帶向外海。" },
  { fishId: "giant_sea_bass", title: "海藻林讓開了一條寬路", body: ["巨堅鱗鱸從偏暖的林緣慢慢現身。灰黑身體沒有急著衝刺，海藻葉片卻依序向兩側傾斜，替牠讓出一條有重量的路。"], closing: "巨大的相遇不必喧鬧，整座林已替牠說明了尺度。" },
  { fishId: "yelloweye_rockfish", title: "深礁先亮起一雙黃眼", body: ["冷雨下的海藻林幾乎失去顏色，黃眼平鮋卻從深礁陰影裡交出一雙明亮眼睛。橙紅身軀只停留片刻，又回到長久使用的住處。"], closing: "活得很久的魚，總把大部分故事留在原來的礁石。" },
  { fishId: "bluntnose_sixgill_shark", title: "六道鰓裂掠過藍寒深槽", body: ["灰六鰓鯊沿槽壁抬升，寬厚背影幾乎與深水同色。牠轉身時，六道鰓裂逐一穿過船燈，像深海把一段古老呼吸交到較淺的夜裡。"], closing: "深槽沒有把年代說完，只讓一個輪廓安靜經過。" },
  { fishId: "ocean_sunfish", title: "霧線外的一枚灰月", body: ["翻車魨側躺在晴日表層，高而扁的身體被暖光照成一枚灰色月亮。牠停在冷暖水交界，讓原本看不見的溫度鋒面有了寬度。"], closing: "月亮不只掛在天空，也會在兩種水相遇時短暫漂浮。" },
  { fishId: "basking_shark", title: "潮界張開一座安靜的門", body: ["象鮫張口穿過富含浮游生物的潮界。巨大的身體沒有追逐魚群，只讓冷暖水與微小生命一起流過鰓耙；第一尾史詩魚因此像一座緩慢移動的門。"], closing: "海把最龐大的身形，用來收集最微小的食物。" }
].map((entry, order) => ({
  ...entry,
  id: `journal:fish:${entry.fishId}`,
  categoryId: "rare_fish",
  type: "fish",
  order
})));

export const MAIN_STORY_JOURNAL_ENTRIES = Object.freeze([
  {
    id: "journal:story:sleeping_tide_bay:opening",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 0,
    unlock: { type: "resident-scene", sceneId: "keeper_returning_light" },
    title: "燈塔替我記住方向",
    body: ["離開強制引導後，我第一次自己從近岸出發，也自己沿燈塔的光回到港口。航程追蹤替我記得正在做的事，卻沒有替我決定下一竿。"],
    closing: "真正的第一趟航程，從沒有人替我按下按鈕開始。"
  },
  {
    id: "journal:story:sleeping_tide_bay:keeper_two_habitats",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 1,
    unlock: { type: "resident-scene", sceneId: "keeper_two_habitats" },
    title: "礁影有自己的住處",
    body: ["近岸與礁石的兩筆捕獲讓圖鑑裡的棲地不再只是標籤。常見與少見魚會在海域裡移動；稀有以上魚類則只會進入標示的限定釣點。"],
    closing: "在尋找名字以前，我先學會尊重牠生活的位置。"
  },
  {
    id: "journal:story:sleeping_tide_bay:keeper_catch_destinations",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 2,
    unlock: { type: "resident-scene", sceneId: "keeper_catch_destinations" },
    title: "今天的魚要去哪裡",
    body: ["我把兩份漁獲交給市場，也替船屋留下第一份水族箱標本。無論販售或展示，圖鑑保存的相遇、尺寸與環境紀錄都沒有消失。"],
    closing: "收藏不是把所有相遇留成同一種形狀。"
  },
  {
    id: "journal:story:sleeping_tide_bay:keeper_four_lights",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 3,
    unlock: { type: "resident-scene", sceneId: "keeper_four_lights" },
    title: "一天裡的四種光",
    body: ["我在兩個不同時段留下捕獲紀錄，才明白清晨、白日、黃昏與夜晚不是四張背景，而是魚群各自生活的時間。"],
    closing: "換一種光，海灣便把另一種日常交給我看。"
  },
  {
    id: "journal:story:sleeping_tide_bay:keeper_weather_surface",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 4,
    unlock: { type: "resident-scene", sceneId: "keeper_weather_surface" },
    title: "天氣寫在海面上",
    body: ["我依晴雨與圖鑑偏好安排出航。天氣讓某些魚更常靠近，卻不是禁止其他相遇的門；今日特殊海況也只是選填紀錄，不會代替主線。"],
    closing: "天氣改變水色，沒有替我決定今天一定要做什麼。"
  },
  {
    id: "journal:story:sleeping_tide_bay:keeper_outer_current_chart",
    categoryId: "sleeping_tide_bay",
    regionId: "sleeping_tide_bay",
    type: "story",
    order: 5,
    unlock: { type: "resident-scene", sceneId: "keeper_outer_current_chart" },
    title: "灣外的暖流線",
    body: ["眠潮灣三十種魚裡，我已認識二十四種。燈塔守望者依八成探索紀錄補完《眠潮灣外海圖》，讓船屋航圖桌第一次出現通往琉光群島的暖流線。"],
    closing: "海圖沒有催我離開，只確保想出發時仍找得到回來的路。"
  },
  {
    id: "journal:story:sleeping_tide_bay:silver_tide",
    categoryId: "sea_events",
    regionId: "sleeping_tide_bay",
    type: "event",
    order: 0,
    unlock: { type: "region-event", eventId: "silver_tide" },
    title: "銀潮靠岸",
    body: ["成群銀色小魚沿潮線靠近淺灘。我順著今日特殊海況留下三筆捕獲；這段紀錄沒有推動主線，只保存海灣偶爾改變的日常。"],
    closing: "選擇參與的潮聲，也值得在海況冊留下一頁。"
  },
  {
    id: "journal:story:sleeping_tide_bay:moonlit_tide",
    categoryId: "sea_events",
    regionId: "sleeping_tide_bay",
    type: "event",
    order: 1,
    unlock: { type: "region-event", eventId: "moonlit_tide" },
    title: "月光潮汐",
    body: ["夜色讓礁石與深水之間的潮路浮現。這是當日選填的特殊海況，不完成也不會阻擋任何故事；我只在願意時沿冷光留下紀錄。"],
    closing: "月亮替夜行方向描邊，沒有替旅程排定期限。"
  },
  {
    id: "journal:story:sleeping_tide_bay:rain_drift",
    categoryId: "sea_events",
    regionId: "sleeping_tide_bay",
    type: "event",
    order: 2,
    unlock: { type: "region-event", eventId: "rain_drift" },
    title: "雨後漂流",
    body: ["細雨把海草、碎貝與浮木推向礁石，藏在漂流帶裡的魚也跟著靠岸。這是特殊海況的獨立紀錄，不與第一章主線共用進度。"],
    closing: "雨停以前，礁石替漂來的生命留了一處短暫港口。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_drifting_observer",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 0,
    unlock: { type: "resident-scene", sceneId: "chengye_drifting_observer" },
    title: "繞了半片海的觀測器",
    body: ["風棲港的曬網棚旁，我遇見正在拆解漂流觀測器的澄野。他替群島記魚，也記那些不適合被帶走的相遇；那顆繞了半片海才回港的浮標，成了我們第一段談話的起點。"],
    closing: "有些相遇不是第一次靠岸，而是終於被另一個人看見。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_lagoon_margin",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 1,
    unlock: { type: "resident-scene", sceneId: "chengye_lagoon_margin" },
    title: "潟湖邊緣的三種藍",
    body: ["澄野把我帶回來的三種魚，看成三種不同水色：淺灘、珊瑚影，以及魚群轉身時短暫亮起的藍。我們開始把『看見了』說得更仔細，卻不急著替每件事找到答案。"],
    closing: "研究有時只是讓同一片藍，擁有更準確的名字。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_anemone_home",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 2,
    unlock: { type: "resident-scene", sceneId: "chengye_anemone_home" },
    title: "不帶走的第一頁",
    body: ["在星落觀察岬，我和澄野一起等克氏雙鋸魚回到海葵。那次記錄沒有魚鉤，也沒有把任何東西帶回船上；知道牠仍住在原來的地方，反而讓頁面變得完整。"],
    closing: "收藏不一定要握在手裡，也可以留在牠原來生活的海。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_current_edge",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 3,
    unlock: { type: "resident-scene", sceneId: "chengye_current_edge" },
    title: "黑潮頁角",
    body: ["藍渠外的深色並不是陰影，而是暖流把很遠的海帶到群島邊上。澄野沒有把每條線畫滿；海圖需要留一點空白，下一次出航才有地方落下。"],
    closing: "沒有畫完的潮線，並不等於沒有方向。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_twospined_light",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 4,
    unlock: { type: "resident-scene", sceneId: "chengye_twospined_light" },
    title: "礁影沒有關上門",
    body: ["紫橙色的雙棘甲尻魚從礁影裡游出。我們沒有把這一刻寫成『終於捕獲』，而是記下日期、海況，以及兩個人一起等到牠願意現身的時間。"],
    closing: "等待不是空白，它讓相遇仍然屬於對方。"
  },
  {
    id: "journal:story:luminous_archipelago:chengye_current_map",
    categoryId: "luminous_archipelago",
    regionId: "luminous_archipelago",
    type: "story",
    order: 5,
    unlock: { type: "resident-scene", sceneId: "chengye_current_map" },
    title: "留在海裡的收藏",
    body: ["完成群島的主要研究後，澄野把手繪黑潮生態圖交給我。圖上的暖流沒有結束，而是向一片冷霧伸去；那條未完成的線，已經替下一段航程留下方向。"],
    closing: "一章結束時，真正重要的線索往往仍指向海圖之外。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_bell_before_harbor",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 0,
    unlock: { type: "resident-scene", sceneId: "wuhe_bell_before_harbor" },
    title: "先聽見鐘，才看見港",
    body: ["澄野手繪圖上的暖流進入冷霧後，我先聽見霧鐘，才看見聽霧港。兩筆陸棚捕獲分別從冷暖水側而來，替灰藍海面畫出第一道看不見的潮界。"],
    closing: "霧沒有拿走方向，只讓水溫與鐘聲先替岸線說話。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_two_buckets_of_sea",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 1,
    unlock: { type: "resident-scene", sceneId: "wuhe_two_buckets_of_sea" },
    title: "兩桶都是霧岬的海",
    body: ["我分別在霧線陸棚與低語海藻林留下捕獲。陸棚魚線被潮界橫向推開，林下魚線則在葉片背後放鬆；比較沒有選出更好的水，只讓差異有了位置。"],
    closing: "同一片海可以同時容納兩種溫度、許多速度與更多住處。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_holdfast_current",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 2,
    unlock: { type: "resident-scene", sceneId: "wuhe_holdfast_current" },
    title: "吸盤記住的流速",
    body: ["太平洋刺圓鰭魚用腹部吸盤留在海藻根部。牠沒有逆流遠游，只在浪後換了一次附著位置；那個小動作讓林下最安穩的一層水被正式記錄。"],
    closing: "留在原處也不是靜止，而是一種很細緻的航行。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_bluecold_sounding",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 3,
    unlock: { type: "resident-scene", sceneId: "wuhe_bluecold_sounding" },
    title: "深槽收好最慢的寒流",
    body: ["藍寒深槽的兩筆捕獲帶著漫長而穩定的拉力。表層潮界一天能移動幾次，深槽冷水卻慢得多；同一場霧，對不同深度的魚有完全不同的意義。"],
    closing: "一片海不必只有一個速度，慢水也有自己的日常。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_kelp_line_moves",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 4,
    unlock: { type: "resident-scene", sceneId: "wuhe_kelp_line_moves" },
    title: "一段會游動的葉柄",
    body: ["海藻海龍離開一根莖，穿過短短開水，再直立於另一層葉片。牠只移動了一小段，卻把冷暖水在林中的交換位置完整連起來。"],
    closing: "準確寫下『今天在這裡』，比假裝界線永遠不動更可靠。"
  },
  {
    id: "journal:story:mist_cape_cold_current:wuhe_seasonal_section",
    categoryId: "mist_cape_cold_current",
    regionId: "mist_cape_cold_current",
    type: "story",
    order: 5,
    unlock: { type: "resident-scene", sceneId: "wuhe_seasonal_section" },
    title: "會換季的雙流剖面",
    body: ["完成二十八種霧岬魚類的八成主研究後，霧禾把《霧岬雙流溫度剖面圖》裝進船屋航圖桌。多年舊頁顯示寒流會隨季節與長風收放，下一片海的群島正由那些風安排生活。"],
    closing: "看懂兩種水如何相遇後，我開始留意讓整片海換季的風。"
  }
]);

export const JOURNAL_ENTRY_TYPE_LABELS = Object.freeze({
  today: "今日潮記",
  fish: "稀有初遇",
  event: "特殊海況",
  story: "主線潮記"
});

export function journalTemplateByEventType(eventType) {
  return JOURNAL_EVENT_TEMPLATES.find(template => template.eventType === eventType) || null;
}

export function rareFishJournalEntryByFishId(fishId) {
  return RARE_FISH_JOURNAL_ENTRIES.find(entry => entry.fishId === fishId) || null;
}

export function storyJournalEntryByEvent(event) {
  if (event?.type === "region.event.progress" && event.payload?.completed) {
    return MAIN_STORY_JOURNAL_ENTRIES.find(entry => entry.unlock?.type === "region-event" && entry.unlock.eventId === event.refs?.eventId) || null;
  }
  if (event?.type === "resident.story.completed") {
    return MAIN_STORY_JOURNAL_ENTRIES.find(entry => entry.unlock?.type === "resident-scene" && entry.unlock.sceneId === event.refs?.milestoneId) || null;
  }
  return null;
}
