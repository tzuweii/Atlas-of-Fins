import { LUMINOUS_ARCHIPELAGO_ID } from "./regions.js";

export const LUMINOUS_ARCHIPELAGO_FISH_COUNT = 33;

const ECOLOGY_CHECKED_AT = "2026-07-19";

const ecologySource = scientific => ({
  label: "FishBase 物種摘要",
  url: `https://www.fishbase.se/summary/${scientific.replaceAll(" ", "-")}.html`,
  checkedAt: ECOLOGY_CHECKED_AT,
  note: "依物種摘要的分布、棲地與最大體長簡化為琉光群島的釣點、時段及遊戲尺寸。"
});

const luminousHabitat = (spotIds, timeIds, weatherIds, baseWeight = 1, sizeScale = 1) => ({
  regionId: LUMINOUS_ARCHIPELAGO_ID,
  spotIds: [...spotIds],
  timeIds: [...timeIds],
  weatherIds: [...weatherIds],
  baseWeight,
  sizeScale
});

const islandFish = ({
  id, name, english, scientific, rarity, bodyClass, spots, times, weather, baits, behavior,
  length, weight, price, difficulty, shape, colors, short, detail, fact, tags = [],
  baseWeight = 1, sizeScale = 1
}) => ({
  id, name, english, scientific, rarity, bodyClass,
  spots: [...spots], times: [...times], weather, baits: [...baits], behavior,
  minLength: length[0], maxLength: length[1], minWeight: weight[0], maxWeight: weight[1], basePrice: price,
  difficulty, shape, colors: [...colors], short, detail, fact, tags: [...tags],
  ecologySource: ecologySource(scientific),
  habitats: [luminousHabitat(spots, times, weather === "any" ? ["sunny", "rain"] : [weather], baseWeight, sizeScale)]
});

export const LUMINOUS_ARCHIPELAGO_FISH = [
  islandFish({
    id: "bluegreen_chromis", name: "藍綠光鰓魚", english: "Blue-green Chromis", scientific: "Chromis viridis",
    rarity: "common", bodyClass: "small", spots: ["prism_coral_garden"], times: ["dawn","day"], weather: "sunny", baits: ["bread","shrimp"], behavior: "sway",
    length: [5,10], weight: [.02,.08], price: 48, difficulty: .78, shape: "round", colors: ["#79d7c5","#4f91b2"],
    short: "薄荷藍的小魚群懸在珊瑚枝上方，轉身時像一片同步亮起的水光。",
    detail: "藍綠光鰓魚常在受遮蔽的礁坪與潟湖成群活動，白天停留在枝狀珊瑚上方取食水中的浮游生物，遇到動靜便一起縮回珊瑚間。",
    fact: "繁殖期間，雄魚會守護附著在底部的魚卵，並用尾鰭帶動水流替魚卵換氣。",
    tags: ["small","reef","tropical"]
  }),
  islandFish({
    id: "pennant_coralfish", name: "長旗珊瑚魚", english: "Pennant Coralfish", scientific: "Heniochus acuminatus",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden","warm_current_channel"], times: ["day","dusk"], weather: "any", baits: ["shrimp"], behavior: "sway",
    length: [12,25], weight: [.12,.65], price: 132, difficulty: 1.18, shape: "flat", colors: ["#f2e7c6","#343d47"],
    short: "黑白相間的扁平魚身拖著長長背旗，像一枚在礁坡間緩慢轉向的風標。",
    detail: "長旗珊瑚魚偏好受保護的深潟湖、通道與外礁坡，通常不會離礁體太遠；幼魚多半獨行，成魚則常成對活動並啄食浮游生物。",
    fact: "幼魚偶爾會替其他魚清理體表寄生物，長背鰭也讓牠在遠處就很容易辨認。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "orangespine_unicornfish", name: "橙棘鼻魚", english: "Orangespine Unicornfish", scientific: "Naso lituratus",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden","warm_current_channel"], times: ["day"], weather: "sunny", baits: ["shrimp","bread"], behavior: "endurance",
    length: [24,60], weight: [.45,3.8], price: 146, difficulty: 1.3, shape: "flat", colors: ["#687f87","#ee8a47"],
    short: "灰藍身側襯著尾柄橙棘，沿著外礁藻帶穩定巡游，轉身時格外醒目。",
    detail: "橙棘鼻魚生活在珊瑚礁與岩礁外緣，白天沿著礁面尋找藻類。成魚尾柄兩側有橙色骨質棘，能在魚群中形成清楚辨識特徵。",
    fact: "雖然英文名帶有 Unicornfish，這一種成魚額頭並不會長出明顯長角。",
    tags: ["large","reef","tropical"]
  }),
  islandFish({
    id: "moorish_idol", name: "角鐮魚", english: "Moorish Idol", scientific: "Zanclus cornutus",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["dawn","day"], weather: "any", baits: ["shrimp","worm"], behavior: "sway",
    length: [11,23], weight: [.1,.55], price: 158, difficulty: 1.28, shape: "flat", colors: ["#f0cf55","#29323b"],
    short: "黑黃白色帶繞過高聳背鰭，細長尾絲在珊瑚縫間畫出柔軟弧線。",
    detail: "角鐮魚廣泛分布於熱帶與亞熱帶礁區，會在礁坪、潟湖與外礁坡尋找海綿和附著生物；成魚可能單獨、成對或小群活動。",
    fact: "牠是角鐮魚科唯一現生物種，長長的背鰭絲與黑白黃帶讓輪廓十分獨特。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "yellowtail_fusilier", name: "黃尾梅鯛", english: "Redbelly Yellowtail Fusilier", scientific: "Caesio cuning",
    rarity: "common", bodyClass: "small", spots: ["windrest_shallows","warm_current_channel"], times: ["day","dusk"], weather: "any", baits: ["bread","shrimp"], behavior: "sprint",
    length: [15,38], weight: [.16,1.05], price: 68, difficulty: .96, shape: "torpedo", colors: ["#6aa6c2","#f0c94f"],
    short: "藍銀魚群拖著鮮黃尾鰭順流掠過，像一束在水道裡整齊轉彎的光。",
    detail: "黃尾梅鯛常在沿岸礁區聚成魚群，白天於礁體上方的水層巡游並取食浮游生物，受到驚擾時會以緊密隊形迅速改變方向。",
    fact: "梅鯛類流線身形適合持續游動，休息時也常維持在礁體上方而不是躲進洞穴。",
    tags: ["small","sprint","tropical"]
  }),
  islandFish({
    id: "bigeye_scad", name: "大眼鯵", english: "Bigeye Scad", scientific: "Selar crumenophthalmus",
    rarity: "common", bodyClass: "small", spots: ["windrest_shallows","warm_current_channel"], times: ["dusk","night"], weather: "any", baits: ["bread","cutfish"], behavior: "sprint",
    length: [16,36], weight: [.14,.78], price: 72, difficulty: 1.02, shape: "torpedo", colors: ["#9bbfc2","#526f8b"],
    short: "圓亮大眼在暮色水面下成列閃動，夜色越深，魚群越靠近港外潮路。",
    detail: "大眼鯵白天常聚成緊密魚群，夜間分散覓食小蝦、底棲無脊椎動物與浮游生物。較大的眼睛有助於牠在低光環境活動。",
    fact: "同一群大眼鯵會在白天靠攏、夜間散開，魚群形狀會隨光線變化。",
    tags: ["small","night","sprint","tropical"]
  }),
  islandFish({
    id: "longface_emperor", name: "長吻龍占", english: "Longface Emperor", scientific: "Lethrinus olivaceus",
    rarity: "common", bodyClass: "large", spots: ["windrest_shallows","prism_coral_garden"], times: ["dawn","dusk"], weather: "any", baits: ["shrimp","worm"], behavior: "steady",
    length: [22,64], weight: [.35,4.2], price: 82, difficulty: 1.08, shape: "slender", colors: ["#a7b49c","#6f806a"],
    short: "修長吻部沿著礁沙交界緩慢探尋，橄欖銀色魚身在晨昏光裡安靜浮現。",
    detail: "長吻龍占常出現在潟湖、海草床與珊瑚礁附近的沙地，會沿著底部尋找甲殼類、軟體動物與小魚，晨昏時較容易靠近淺處。",
    fact: "向前延伸的吻部讓牠能仔細搜尋沙面與礁石縫隙，是辨認龍占類的重要線索。",
    tags: ["bottom","large","tropical"]
  }),
  islandFish({
    id: "peacock_grouper", name: "藍點石斑", english: "Peacock Grouper", scientific: "Cephalopholis argus",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden"], times: ["dusk","night"], weather: "rain", baits: ["shrimp","cutfish"], behavior: "endurance",
    length: [24,58], weight: [.55,4.8], price: 184, difficulty: 1.42, shape: "round", colors: ["#5f604c","#55a8b2"],
    short: "深褐魚身散著細小藍點，雨夜貼著珊瑚陰影移動，像一片會呼吸的礁石。",
    detail: "藍點石斑是礁區伏擊型掠食者，常守在珊瑚洞穴與礁坡附近，利用斑點和深色體表融入背景，再短距離出擊捕捉小魚與甲殼類。",
    fact: "牠身上的藍色小點會一路延伸到魚鰭，在陰影中比整體輪廓更早被看見。",
    tags: ["bottom","reef","night","rain","large"]
  }),
  islandFish({
    id: "yellowstripe_goatfish", name: "黃帶鬚鯛", english: "Yellowstripe Goatfish", scientific: "Mulloidichthys flavolineatus",
    rarity: "common", bodyClass: "small", spots: ["windrest_shallows","prism_coral_garden"], times: ["dawn","day"], weather: "sunny", baits: ["shrimp","worm"], behavior: "sway",
    length: [14,34], weight: [.14,.82], price: 70, difficulty: .98, shape: "slender", colors: ["#e8d8ae","#d9ad45"],
    short: "一條亮黃側線穿過淡色魚身，下巴觸鬚在沙面上慢慢讀著潮水留下的氣味。",
    detail: "黃帶鬚鯛會在沙地、海草床與珊瑚礁周邊覓食，利用下巴成對觸鬚探查沙中的小型底棲動物；休息時有時與同伴聚成魚群。",
    fact: "鬚鯛的下巴觸鬚帶有化學感受能力，能在看不見獵物時協助辨認藏在沙裡的食物。",
    tags: ["bottom","small","tropical"]
  }),
  islandFish({
    id: "bluespotted_cornetfish", name: "藍斑煙管魚", english: "Bluespotted Cornetfish", scientific: "Fistularia commersonii",
    rarity: "rare", bodyClass: "large", spots: ["warm_current_channel"], times: ["dawn","day"], weather: "sunny", baits: ["cutfish","glow"], behavior: "rare",
    length: [48,120], weight: [.45,3.6], price: 345, difficulty: 1.58, shape: "needle", colors: ["#689f9d","#356b77"],
    short: "細長身體像一支漂在藍渠裡的蘆管，尾端絲線順著暖流筆直延伸。",
    detail: "藍斑煙管魚棲息於礁區、潟湖與近岸水層，常以細長身形緩慢接近小魚，再利用管狀吻部快速吸入獵物；體色能在綠灰與藍色間變化。",
    fact: "牠尾鰭中央延伸出細長絲狀構造，身形雖長，身體截面卻窄得像一根海中管線。",
    tags: ["rare","large","sprint","tropical"]
  }),
  islandFish({
    id: "giant_trevally", name: "浪人鰺", english: "Giant Trevally", scientific: "Caranx ignobilis",
    rarity: "rare", bodyClass: "large", spots: ["warm_current_channel"], times: ["dawn","dusk"], weather: "any", baits: ["cutfish","glow"], behavior: "rare",
    length: [58,138], weight: [3.8,28], price: 465, difficulty: 1.82, shape: "torpedo", colors: ["#7e918f","#344f58"],
    short: "厚實銀灰輪廓從暖流深處穩穩逼近，短促加速像整片海水忽然向前推了一步。",
    detail: "浪人鰺是熱帶印度－太平洋的強健巡游魚，會利用礁坡、通道與潮流交會處尋找獵物；大型個體多半獨行，擁有強勁而持久的游動能力。",
    fact: "年輕浪人鰺可能進入潟湖與河口，成長後則更常出現在外礁與較深通道。",
    tags: ["rare","large","sprint","tropical"], baseWeight: .72, sizeScale: 1.05
  }),
  islandFish({
    id: "convict_surgeonfish", name: "條紋刺尾鯛", english: "Convict Surgeonfish", scientific: "Acanthurus triostegus",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","prism_coral_garden"], times: ["dawn","day"], weather: "sunny", baits: ["bread","shrimp"], behavior: "sway",
    length: [10,27], weight: [.08,.48], price: 74, difficulty: .96, shape: "flat", colors: ["#d8d3ba","#4c5660"],
    short: "五道深色直紋穿過淡銀魚身，小群貼著淺礁一起啄食藻膜。",
    detail: "條紋刺尾鯛會在潟湖、潮池與向海礁坡成群活動，幼魚尤其常出現在溫暖淺水，沿著硬底表面取食絲狀藻類。",
    fact: "覓食魚群會像一隊移動的小刮刀，把礁面上的藻類依序整理過去。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "blacktip_fusilier", name: "黑尾梅鯛", english: "Blacktip Fusilier", scientific: "Pterocaesio digramma",
    rarity: "common", bodyClass: "small", spots: ["windrest_shallows","warm_current_channel"], times: ["day","dusk"], weather: "any", baits: ["bread","shrimp"], behavior: "sprint",
    length: [14,32], weight: [.12,.72], price: 78, difficulty: 1.02, shape: "torpedo", colors: ["#84b6ca","#273e62"],
    short: "兩道細藍線沿銀身奔向黑色尾端，魚群在水道轉彎時像一支整齊箭列。",
    detail: "黑尾梅鯛常在珊瑚礁外緣上方聚群，以浮游動物為食；白天魚群順著水層移動，接近黃昏時會往礁體靠攏。",
    fact: "梅鯛能在礁體上方持續游動，流線身形讓整群魚維持近乎一致的速度。",
    tags: ["small","sprint","tropical"]
  }),
  islandFish({
    id: "goldband_fusilier", name: "金帶梅鯛", english: "Goldband Fusilier", scientific: "Pterocaesio chrysozona",
    rarity: "common", bodyClass: "small", spots: ["prism_coral_garden","warm_current_channel"], times: ["dawn","day"], weather: "sunny", baits: ["bread","shrimp"], behavior: "steady",
    length: [12,28], weight: [.09,.52], price: 76, difficulty: .98, shape: "torpedo", colors: ["#83aeca","#e7bf47"],
    short: "亮黃側帶在藍銀魚身中央延伸，晨光一照，整群像被同一條金線串起。",
    detail: "金帶梅鯛生活在潟湖與珊瑚礁附近，常成群停留於礁體上方取食浮游生物，晴朗時更容易看清身側黃帶。",
    fact: "魚群靠近礁體休息時仍會保持隊形，遇到水流便一起重新展開。",
    tags: ["small","sprint","tropical"]
  }),
  islandFish({
    id: "bluestripe_snapper", name: "四線笛鯛", english: "Common Bluestripe Snapper", scientific: "Lutjanus kasmira",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","prism_coral_garden"], times: ["day","dusk"], weather: "any", baits: ["shrimp","cutfish"], behavior: "steady",
    length: [18,40], weight: [.25,1.5], price: 88, difficulty: 1.08, shape: "slender", colors: ["#efd25f","#6aa5c4"],
    short: "四道藍線平行穿過黃身，魚群安靜聚在洞口與珊瑚陰影旁。",
    detail: "四線笛鯛會在潟湖、礁坡與洞穴周圍聚成魚群，白天常靠近遮蔽物休息，黃昏後才逐漸分散覓食。",
    fact: "幼魚也會利用海草床與小型礁塊，把不同棲地當作成長途中相連的房間。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "thumbprint_emperor", name: "黑點龍占", english: "Thumbprint Emperor", scientific: "Lethrinus harak",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","prism_coral_garden"], times: ["dawn","dusk"], weather: "rain", baits: ["shrimp","worm"], behavior: "steady",
    length: [18,38], weight: [.25,1.45], price: 92, difficulty: 1.1, shape: "slender", colors: ["#b9baa3","#574b43"],
    short: "身側黑斑像潮水按下的一枚指印，沿著雨後沙溝慢慢巡游。",
    detail: "黑點龍占常出現在潟湖、海草床、沙地與珊瑚碎屑交界，會單獨或小群尋找多毛類、甲殼與小型軟體動物。",
    fact: "那枚醒目的側斑讓牠得到 Thumbprint Emperor 的英文名，遠看就像留在魚身上的墨印。",
    tags: ["bottom","rain","tropical"]
  }),
  islandFish({
    id: "blackbarred_halfbeak", name: "斑尾鱵", english: "Black-barred Halfbeak", scientific: "Hemiramphus far",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","warm_current_channel"], times: ["dawn","dusk"], weather: "any", baits: ["bread","cutfish"], behavior: "sprint",
    length: [20,46], weight: [.15,.82], price: 84, difficulty: 1.12, shape: "needle", colors: ["#b8d4cb","#405e74"],
    short: "細長下顎貼著水面向前延伸，尾部黑紋在晨昏浪尖間一閃一閃。",
    detail: "斑尾鱵多在近岸表層、潟湖與礁區周圍活動，細長身體適合沿水面快速前進，也會成群追隨潮線。",
    fact: "牠只有下顎明顯延長，因此英文稱為 Halfbeak，而不是上下顎都細長的針魚。",
    tags: ["sprint","tropical"]
  }),
  islandFish({
    id: "threadfin_butterflyfish", name: "人字蝶", english: "Threadfin Butterflyfish", scientific: "Chaetodon auriga",
    rarity: "common", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["dawn","day"], weather: "sunny", baits: ["shrimp"], behavior: "sway",
    length: [10,23], weight: [.08,.42], price: 86, difficulty: 1.04, shape: "flat", colors: ["#f2dd8a","#4c5862"],
    short: "斜線在白黃魚身上交成細密人字，背鰭長絲隨珊瑚間的微流輕擺。",
    detail: "人字蝶生活在潟湖、珊瑚礁與岩礁區，以細長吻部在礁縫尋找小型底棲生物，成魚常成對活動。",
    fact: "幼魚背鰭附近的深色眼斑能混淆掠食者，真正的眼睛則藏在頭部黑帶旁。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "yellowfin_goatfish", name: "黃鰭鬚鯛", english: "Yellowfin Goatfish", scientific: "Mulloidichthys vanicolensis",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","prism_coral_garden"], times: ["dawn","day"], weather: "any", baits: ["shrimp","worm"], behavior: "sway",
    length: [16,38], weight: [.18,1.05], price: 82, difficulty: 1.02, shape: "slender", colors: ["#ddd8bd","#e7be47"],
    short: "淡銀魚身映著鮮黃魚鰭，兩根觸鬚沿沙面分頭尋找藏起來的小生物。",
    detail: "黃鰭鬚鯛會在珊瑚礁、沙地與海草床交界活動，白天可能聚群休息，覓食時則用下巴觸鬚翻找底棲獵物。",
    fact: "同一群鬚鯛休息時能整齊懸在礁旁，一開始覓食便像許多支探針同時落向沙面。",
    tags: ["bottom","tropical"]
  }),
  islandFish({
    id: "redtooth_triggerfish", name: "紅牙鱗魨", english: "Redtoothed Triggerfish", scientific: "Odonus niger",
    rarity: "common", bodyClass: "standard", spots: ["prism_coral_garden","warm_current_channel"], times: ["day","dusk"], weather: "any", baits: ["shrimp","cutfish"], behavior: "sway",
    length: [18,42], weight: [.32,1.8], price: 96, difficulty: 1.16, shape: "flat", colors: ["#344f82","#d56b58"],
    short: "深藍魚身藏著一小排紅齒，背鰭豎起時像替自己扣上一枚礁石門閂。",
    detail: "紅牙鱗魨常在外礁坡與水流明顯的礁區活動，會在水層中取食浮游動物，遇到威脅時能利用背鰭棘固定姿勢。",
    fact: "鱗魨的第一背鰭棘能被第二棘卡住，像扳機一樣鎖定，這也是 Triggerfish 名稱的由來。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "pinecone_soldierfish", name: "松毬金鱗魚", english: "Pinecone Soldierfish", scientific: "Myripristis murdjan",
    rarity: "common", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["dusk","night"], weather: "any", baits: ["worm","glow"], behavior: "steady",
    length: [14,27], weight: [.16,.72], price: 90, difficulty: 1.08, shape: "round", colors: ["#c95854","#d8b879"],
    short: "紅色大鱗在夜礁裡一片片亮起，大眼從洞口先看見船燈。",
    detail: "松毬金鱗魚白天多藏在洞穴、礁縫與遮蔽處，黃昏後才離開礁影覓食；較大的眼睛適合低光環境。",
    fact: "金鱗魚的粗大鱗片在側光下像松毬層層排列，魚群躲進洞裡時仍會反射微弱紅光。",
    tags: ["night","reef","tropical"]
  }),
  islandFish({
    id: "goldlined_rabbitfish", name: "金線藍子魚", english: "Golden-lined Spinefoot", scientific: "Siganus lineatus",
    rarity: "common", bodyClass: "standard", spots: ["windrest_shallows","prism_coral_garden"], times: ["day","dusk"], weather: "sunny", baits: ["bread","shrimp"], behavior: "sway",
    length: [18,42], weight: [.3,1.65], price: 94, difficulty: 1.12, shape: "flat", colors: ["#9cae86","#e0c34d"],
    short: "細黃線沿灰綠魚身流動，魚群貼著海草與礁面慢慢修剪嫩藻。",
    detail: "金線藍子魚活動於潟湖、礁坪、海草床與紅樹林鄰近水域，常成群取食底部藻類，偏好溫暖而有遮蔽的淺水。",
    fact: "藍子魚的背鰭與臀鰭棘具有防禦作用，覓食時看似安靜，遇到威脅仍能迅速豎起。",
    tags: ["reef","tropical"]
  }),
  islandFish({
    id: "palette_surgeonfish", name: "藍倒吊", english: "Palette Surgeonfish", scientific: "Paracanthurus hepatus",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["day"], weather: "sunny", baits: ["shrimp","bread"], behavior: "sprint",
    length: [14,31], weight: [.18,.95], price: 176, difficulty: 1.34, shape: "flat", colors: ["#2e70b6","#f0cf45"],
    short: "亮藍魚身繞著深色弧紋，黃尾在枝狀珊瑚上方俐落翻轉。",
    detail: "藍倒吊生活在清澈的外礁與珊瑚密集區，幼魚會利用枝狀珊瑚遮蔽，成魚則在礁面附近取食藻類與浮游生物。",
    fact: "受驚時牠可能側躺藏進珊瑚縫，尾柄上的尖棘仍會朝外保護自己。",
    tags: ["reef","sprint","tropical"]
  }),
  islandFish({
    id: "ornate_butterflyfish", name: "細紋蝴蝶魚", english: "Ornate Butterflyfish", scientific: "Chaetodon ornatissimus",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["dawn","day"], weather: "sunny", baits: ["shrimp"], behavior: "sway",
    length: [10,20], weight: [.07,.34], price: 184, difficulty: 1.38, shape: "flat", colors: ["#f1d75d","#557fa0"],
    short: "橙色斜紋一筆筆排過黃身，成對身影沿著活珊瑚表面緩慢巡游。",
    detail: "細紋蝴蝶魚偏好珊瑚生長良好的清澈潟湖與向海礁坡，常成對活動，細小嘴部適合從珊瑚表面取食。",
    fact: "牠的斜向細紋會在游動時產生交錯感，使輪廓看起來像被水光切成許多小片。",
    tags: ["reef","tropical"], baseWeight: .86
  }),
  islandFish({
    id: "regal_angelfish", name: "皇帝神仙魚", english: "Regal Angelfish", scientific: "Pygoplites diacanthus",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden"], times: ["dawn","dusk"], weather: "any", baits: ["shrimp","worm"], behavior: "sway",
    length: [13,25], weight: [.12,.62], price: 198, difficulty: 1.42, shape: "flat", colors: ["#f0c44d","#52689b"],
    short: "黃、藍與白色條帶像整齊禮服，從洞穴邊緣安靜滑進珊瑚庭。",
    detail: "皇帝神仙魚出現在珊瑚豐富的潟湖與向海礁區，常靠近洞穴和遮蔽物活動，以海綿及被囊動物為食。",
    fact: "鮮明條帶不只裝飾魚身，也會在珊瑚陰影與碎光之間打散完整輪廓。",
    tags: ["reef","tropical"], baseWeight: .82
  }),
  islandFish({
    id: "clown_triggerfish", name: "小丑鱗魨", english: "Clown Triggerfish", scientific: "Balistoides conspicillum",
    rarity: "uncommon", bodyClass: "standard", spots: ["prism_coral_garden","warm_current_channel"], times: ["day"], weather: "sunny", baits: ["shrimp","cutfish"], behavior: "endurance",
    length: [20,50], weight: [.45,3.2], price: 220, difficulty: 1.5, shape: "box", colors: ["#202b35","#f0d05a"],
    short: "黑腹上的白圓斑與黃背細紋形成強烈對比，像礁區裡一面會游動的旗。",
    detail: "小丑鱗魨生活在清澈的沿岸與外礁環境，會在礁體附近尋找甲殼、軟體動物與其他底棲食物。",
    fact: "牠能用堅固牙齒處理帶殼獵物，背鰭棘則能把身體牢牢固定在礁縫裡。",
    tags: ["reef","tropical"], baseWeight: .78
  }),
  islandFish({
    id: "longfin_batfish", name: "燕魚", english: "Longfin Batfish", scientific: "Platax teira",
    rarity: "uncommon", bodyClass: "large", spots: ["windrest_shallows","warm_current_channel"], times: ["dusk","night"], weather: "any", baits: ["shrimp","cutfish"], behavior: "sway",
    length: [24,68], weight: [.7,5.8], price: 206, difficulty: 1.46, shape: "flat", colors: ["#aeb4ad","#424b4f"],
    short: "高而扁的銀灰魚身拖著長鰭，暮色裡像一片緩慢轉向的船帆。",
    detail: "燕魚幼體可在受遮蔽的近岸與漂浮物周圍活動，成魚則常出現在較深礁坡、沉船與外海結構附近。",
    fact: "年輕燕魚的背鰭和臀鰭比例特別修長，成長後輪廓會逐漸變得寬厚。",
    tags: ["large","sway","tropical"], baseWeight: .84
  }),
  islandFish({
    id: "harlequin_sweetlips", name: "花斑胡椒鯛", english: "Harlequin Sweetlips", scientific: "Plectorhinchus chaetodonoides",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden"], times: ["dusk","night"], weather: "rain", baits: ["worm","cutfish"], behavior: "endurance",
    length: [24,72], weight: [.65,6.8], price: 232, difficulty: 1.54, shape: "round", colors: ["#eee3c7","#473c3f"],
    short: "深色圓斑灑滿淡色厚身，夜雨裡貼著礁腳沉穩擺尾。",
    detail: "花斑胡椒鯛成魚常在珊瑚礁洞穴、礁坡與突出岩棚附近活動，夜間離開遮蔽處尋找底棲無脊椎動物。",
    fact: "幼魚的斑紋與游姿和成魚差異很大，會以誇張擺動模仿有毒扁蟲的輪廓。",
    tags: ["bottom","large","night","rain","tropical"], baseWeight: .76
  }),
  islandFish({
    id: "giant_moray", name: "巨型裸胸鱔", english: "Giant Moray", scientific: "Gymnothorax javanicus",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden"], times: ["night"], weather: "rain", baits: ["cutfish","glow"], behavior: "endurance",
    length: [70,180], weight: [4.5,32], price: 248, difficulty: 1.62, shape: "ribbon", colors: ["#554f3f","#9b8462"],
    short: "粗長身體從雨夜礁洞探出，斑駁褐紋像長年留在岩壁上的潮痕。",
    detail: "巨型裸胸鱔生活在熱帶礁區與岩洞，白天多藏身縫隙，夜間外出尋找魚類與甲殼；粗壯身體適合在洞穴間轉向。",
    fact: "裸胸鱔張合嘴巴常是在讓水流通過鰓部，不代表牠一直準備攻擊。",
    tags: ["bottom","large","night","rain","tropical"], baseWeight: .7
  }),
  islandFish({
    id: "bluespine_unicornfish", name: "單角鼻魚", english: "Bluespine Unicornfish", scientific: "Naso unicornis",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden","warm_current_channel"], times: ["day","dusk"], weather: "sunny", baits: ["shrimp","cutfish"], behavior: "endurance",
    length: [34,70], weight: [1.1,7.5], price: 218, difficulty: 1.5, shape: "flat", colors: ["#71888a","#4b78a2"],
    short: "額前短角與藍色尾棘在灰綠魚身上格外清楚，沿外礁藻帶緩慢巡游。",
    detail: "單角鼻魚常見於潟湖、礁道與向海礁坡，成魚在日間取食大型藻類，較大的個體也會沿外礁水流移動。",
    fact: "額前角會隨成長逐漸明顯，但真正需要小心的是尾柄兩側可用來防禦的硬棘。",
    tags: ["large","reef","tropical"], baseWeight: .8
  }),
  islandFish({
    id: "chinese_trumpetfish", name: "中華管口魚", english: "Chinese Trumpetfish", scientific: "Aulostomus chinensis",
    rarity: "uncommon", bodyClass: "large", spots: ["prism_coral_garden","warm_current_channel"], times: ["dawn","day"], weather: "any", baits: ["shrimp","cutfish"], behavior: "steady",
    length: [38,80], weight: [.4,2.4], price: 212, difficulty: 1.46, shape: "needle", colors: ["#b59b62","#667b64"],
    short: "長管狀吻部貼著珊瑚陰影前進，整條魚像一支被水流扶住的細號角。",
    detail: "中華管口魚生活在熱帶礁區與岩礁，會利用細長身形緩慢靠近獵物，也可能貼近較大的魚借用對方輪廓掩護。",
    fact: "牠不是用長吻咬住獵物，而是迅速張口形成吸力，把小魚吸進管狀嘴中。",
    tags: ["large","reef","tropical"], baseWeight: .82
  }),
  islandFish({
    id: "dogtooth_tuna", name: "裸狐鰹", english: "Dogtooth Tuna", scientific: "Gymnosarda unicolor",
    rarity: "rare", bodyClass: "large", spots: ["warm_current_channel"], times: ["dawn","dusk"], weather: "sunny", baits: ["cutfish","glow"], behavior: "rare",
    length: [72,190], weight: [5.5,58], price: 560, difficulty: 1.94, shape: "torpedo", colors: ["#667c83","#33434d"],
    short: "厚實流線身影從藍渠深處加速上浮，銀灰側線像被暖流磨亮的刀背。",
    detail: "裸狐鰹是熱帶印度－太平洋的礁區大型巡游魚，會在陡峭礁坡、通道與外海水層追逐魚群，擁有持久而強勁的游動能力。",
    fact: "口中的大型錐狀牙齒使牠得到 Dogtooth Tuna 的英文名，但牠其實與一般鮪魚分屬不同屬。",
    tags: ["rare","large","sprint","tropical"], baseWeight: .56, sizeScale: 1.04
  }),
  islandFish({
    id: "scrawled_filefish", name: "長尾革單棘魨", english: "Scrawled Filefish", scientific: "Aluterus scriptus",
    rarity: "rare", bodyClass: "large", spots: ["prism_coral_garden","warm_current_channel"], times: ["day","dusk"], weather: "rain", baits: ["cutfish","glow"], behavior: "rare",
    length: [48,108], weight: [1.4,9.5], price: 495, difficulty: 1.84, shape: "flat", colors: ["#719d91","#4a6f7e"],
    short: "青灰魚身寫滿藍色曲線與斑點，長尾在雨幕裡像一張尚未乾透的海圖。",
    detail: "長尾革單棘魨廣布於熱帶海域，會在珊瑚礁、岩礁與外海漂浮物附近活動；成魚體型修長而側扁，能隨環境調整體色。",
    fact: "魚身上的藍色曲線像隨手寫下的字跡，因此英文名稱使用 Scrawled 形容這些自然紋路。",
    tags: ["rare","large","reef","rain","tropical"], baseWeight: .62, sizeScale: 1.03
  })
];

if (LUMINOUS_ARCHIPELAGO_FISH.length !== LUMINOUS_ARCHIPELAGO_FISH_COUNT) {
  throw new Error(`琉光群島魚池數量錯誤：預期 ${LUMINOUS_ARCHIPELAGO_FISH_COUNT}，實際 ${LUMINOUS_ARCHIPELAGO_FISH.length}`);
}
