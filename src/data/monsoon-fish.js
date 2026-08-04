import { MONSOON_ARCHIPELAGO_ID } from "./regions.js";
import { fishAppearanceWeight } from "./fish-probabilities.js";

export const MONSOON_FISH_COUNT = 36;

const ECOLOGY_CHECKED_AT = "2026-08-04";

const ecologySource = scientific => ({
  label: "FishBase 物種摘要",
  url: `https://www.fishbase.se/summary/${scientific.replaceAll(" ", "-")}.html`,
  checkedAt: ECOLOGY_CHECKED_AT,
  note: "依物種摘要的分布、棲地與最大體長，簡化為季風群島迎風外水、背風海草床與雨季紅樹岸的遊戲化出現條件。"
});

const monsoonFish = ({
  id, name, english, scientific, rarity, bodyClass, spot, times, weather = "any", baits,
  behavior, length, weight, price, difficulty, shape, colors, short, detail, fact, tags = []
}) => ({
  id, name, english, scientific, rarity, bodyClass,
  spots: [spot], baits: [...baits], behavior,
  appearanceWeight: fishAppearanceWeight(id),
  preferredTimeIds: [...times],
  preferredWeatherIds: weather === "any" ? [] : [weather],
  minLength: length[0], maxLength: length[1], minWeight: weight[0], maxWeight: weight[1],
  basePrice: price, difficulty, shape, colors: [...colors], short, detail, fact, tags: [...tags],
  ecologySource: ecologySource(scientific),
  habitats: [{ regionId: MONSOON_ARCHIPELAGO_ID, spotIds: [spot], sizeScale: 1 }]
});

const WINDWARD = "windward_whitecap_passage";
const SEAGRASS = "leeward_seagrass_bay";
const MANGROVE = "rainmangrove_estuary";

export const MONSOON_FISH = [
  monsoonFish({
    id: "silver_biddy", name: "曳絲鑽嘴魚", english: "Common Silver-biddy", scientific: "Gerres oyena",
    rarity: "common", bodyClass: "small", spot: MANGROVE, times: ["dawn", "day"], weather: "rain", baits: ["bread", "shrimp"], behavior: "steady",
    length: [8, 28], weight: [.03, .42], price: 62, difficulty: .88, shape: "flat", colors: ["#d4d7c1", "#7c9d96"],
    short: "銀白小魚沿淡水羽狀邊界轉身，水色一深便靠向紅樹根影。",
    detail: "曳絲鑽嘴魚常見於沿岸淺水與河口，會在沙泥底啄食小型底棲生物；雨水輸入讓牠沿鹽度漸層移動。",
    fact: "可伸縮的小口適合在沙泥表面搜尋細小獵物。", tags: ["small", "estuary", "rain"]
  }),
  monsoonFish({
    id: "spotted_scat", name: "金錢魚", english: "Spotted Scat", scientific: "Scatophagus argus",
    rarity: "common", bodyClass: "standard", spot: MANGROVE, times: ["day", "dusk"], baits: ["bread", "shrimp"], behavior: "sway",
    length: [12, 34], weight: [.12, 1.15], price: 76, difficulty: 1.02, shape: "flat", colors: ["#ac9d58", "#364f48"],
    short: "斑點圓身在紅樹根間緩慢側轉，混濁水色讓金綠光澤忽明忽暗。",
    detail: "金錢魚能利用河口、紅樹林與半鹹水域，會取食藻類、碎屑與小型動物。",
    fact: "幼魚常進入鹽度變動大的河口，對半鹹水具有良好適應力。", tags: ["estuary", "mangrove"]
  }),
  monsoonFish({
    id: "crescent_grunter", name: "四線雞魚", english: "Jarbua Terapon", scientific: "Terapon jarbua",
    rarity: "common", bodyClass: "standard", spot: MANGROVE, times: ["dawn", "dusk"], baits: ["shrimp", "worm"], behavior: "sprint",
    length: [12, 33], weight: [.11, .86], price: 74, difficulty: 1.02, shape: "torpedo", colors: ["#c8c4a7", "#425d63"],
    short: "彎曲黑線穿過銀身，在鹹淡交會處突然折返。",
    detail: "四線雞魚生活於沿岸、河口與潟湖，能進入半鹹水甚至淡水下游。",
    fact: "雞魚類能以魚鰾相關肌肉發聲，水下可能聽見低沉聲響。", tags: ["estuary", "salinity"]
  }),
  monsoonFish({
    id: "common_ponyfish", name: "短棘鰏", english: "Common Ponyfish", scientific: "Leiognathus equula",
    rarity: "common", bodyClass: "small", spot: MANGROVE, times: ["dusk", "night"], baits: ["shrimp", "worm"], behavior: "steady",
    length: [8, 25], weight: [.03, .34], price: 66, difficulty: .9, shape: "flat", colors: ["#d8d0b0", "#879d9b"],
    short: "薄銀魚身在暗水裡反光，像一枚貼著泥底滑行的小月片。",
    detail: "短棘鰏常在沿岸與河口沙泥底成群，夜間較容易離開混濁底層。",
    fact: "鰏科具有發光器官，微弱光線能從半透明身體透出。", tags: ["small", "night", "estuary"]
  }),
  monsoonFish({
    id: "whitespotted_spinefoot", name: "長鰭藍子魚", english: "White-spotted Spinefoot", scientific: "Siganus canaliculatus",
    rarity: "common", bodyClass: "standard", spot: SEAGRASS, times: ["dawn", "day"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "sway",
    length: [14, 36], weight: [.15, 1.05], price: 84, difficulty: 1.08, shape: "flat", colors: ["#808c68", "#d6cf92"],
    short: "細白斑點在海草葉間閃動，背風水面越平，魚群越貼近草冠。",
    detail: "長鰭藍子魚常利用淺海海草床與礁區，成群取食藻類與植物材料。",
    fact: "背鰭與腹鰭硬棘具有毒腺，是藍子魚的重要防禦。", tags: ["seagrass", "school"]
  }),
  monsoonFish({
    id: "dusky_rabbitfish", name: "褐藍子魚", english: "Mottled Spinefoot", scientific: "Siganus fuscescens",
    rarity: "common", bodyClass: "standard", spot: SEAGRASS, times: ["day", "dusk"], baits: ["bread", "shrimp"], behavior: "sway",
    length: [15, 38], weight: [.18, 1.25], price: 86, difficulty: 1.08, shape: "flat", colors: ["#777457", "#b9b17a"],
    short: "褐色細點融進草床碎影，只有整群換向時才露出輪廓。",
    detail: "褐藍子魚在沿岸礁區與海草床活動，偏植物食，會追隨可利用的藻草帶。",
    fact: "體色能隨背景和狀態變深，使牠在草葉與礁石間不易被看見。", tags: ["seagrass", "herbivore"]
  }),
  monsoonFish({
    id: "orange_spotted_spinefoot", name: "點藍子魚", english: "Orange-spotted Spinefoot", scientific: "Siganus guttatus",
    rarity: "common", bodyClass: "large", spot: SEAGRASS, times: ["dawn", "night"], weather: "rain", baits: ["bread", "shrimp"], behavior: "sway",
    length: [18, 42], weight: [.25, 1.65], price: 94, difficulty: 1.16, shape: "flat", colors: ["#4e6470", "#d5a04f"],
    short: "橙斑在雨後暗水裡一點點亮起，沿草床外緣慢慢巡游。",
    detail: "點藍子魚常見於潟湖、礁區與近岸植被環境，會在低光時段取食。",
    fact: "部分族群有規律的月相繁殖活動，但遊戲只沿用日夜與晴雨條件。", tags: ["large", "seagrass", "rain"]
  }),
  monsoonFish({
    id: "bristle_tail_filefish", name: "毛尾前角魨", english: "Bristle-tail Filefish", scientific: "Acreichthys tomentosus",
    rarity: "common", bodyClass: "small", spot: SEAGRASS, times: ["day", "dusk"], baits: ["shrimp", "worm"], behavior: "sway",
    length: [7, 15], weight: [.02, .12], price: 68, difficulty: .92, shape: "spiky", colors: ["#8d8a5b", "#526e60"],
    short: "小小前角魨靠變色貼住草葉，游動時才像一片葉子忽然離枝。",
    detail: "毛尾前角魨與海草床、藻叢和淺礁關係密切，會利用斑駁體色藏身。",
    fact: "可豎起的第一背棘像一道門閂，能協助牠卡在狹窄遮蔽物中。", tags: ["small", "seagrass", "camouflage"]
  }),
  monsoonFish({
    id: "blue_spotted_emperor", name: "青星九棘鱸", english: "Spangled Emperor", scientific: "Lethrinus nebulosus",
    rarity: "common", bodyClass: "large", spot: SEAGRASS, times: ["dawn", "dusk"], baits: ["shrimp", "worm"], behavior: "endurance",
    length: [24, 72], weight: [.45, 6.8], price: 108, difficulty: 1.28, shape: "torpedo", colors: ["#a7aa83", "#57a7a5"],
    short: "藍色細點掠過草床邊緣，退入沙地時整尾魚忽然清楚。",
    detail: "青星九棘鱸活動於礁區、沙地與海草床，沿底部尋找甲殼類和軟體動物。",
    fact: "厚實臼齒能處理有硬殼的底棲獵物。", tags: ["large", "seagrass", "bottom"]
  }),
  monsoonFish({
    id: "bridled_monocle_bream", name: "二線眶棘鱸", english: "Two-lined Monocle Bream", scientific: "Scolopsis bilineata",
    rarity: "common", bodyClass: "standard", spot: SEAGRASS, times: ["day", "dusk"], weather: "sunny", baits: ["shrimp", "worm"], behavior: "steady",
    length: [12, 28], weight: [.09, .55], price: 82, difficulty: 1.02, shape: "torpedo", colors: ["#eee1be", "#765363"],
    short: "兩道深色縱線沿背風沙草交界前進，水清時最容易辨認。",
    detail: "二線眶棘鱸棲息於珊瑚礁、砂地與海草鄰近水域，常沿底部單獨或小群覓食。",
    fact: "眼下明顯的線紋是英文 monocle bream 名稱的辨識來源之一。", tags: ["seagrass", "clear-water"]
  }),
  monsoonFish({
    id: "indian_mackerel", name: "印度鯖", english: "Indian Mackerel", scientific: "Rastrelliger kanagurta",
    rarity: "common", bodyClass: "standard", spot: WINDWARD, times: ["dawn", "day"], weather: "sunny", baits: ["bread", "cutfish"], behavior: "sprint",
    length: [18, 35], weight: [.16, .72], price: 88, difficulty: 1.14, shape: "torpedo", colors: ["#77a0a5", "#d1d4bd"],
    short: "青銀魚群在白沫下切過浪脊，把迎風表層畫成一排斜線。",
    detail: "印度鯖是近岸表層群游魚，攝食浮游生物並隨高生產力水團移動。",
    fact: "細密鰓耙能從水中篩取浮游生物。", tags: ["school", "windward", "sprint"]
  }),
  monsoonFish({
    id: "shortfin_scad", name: "短鰭鰺", english: "Shortfin Scad", scientific: "Decapterus macrosoma",
    rarity: "common", bodyClass: "standard", spot: WINDWARD, times: ["day", "dusk"], baits: ["bread", "cutfish"], behavior: "sprint",
    length: [18, 36], weight: [.16, .78], price: 86, difficulty: 1.12, shape: "torpedo", colors: ["#5f8792", "#c3cfbd"],
    short: "細長魚群順長浪加速，尾柄小鰭在轉向時連成閃光。",
    detail: "短鰭鰺在近岸至外海表層成群，會追逐浮游動物與小魚。",
    fact: "尾柄附近的小離鰭有助高速游動時穩定水流。", tags: ["school", "windward"]
  }),
  monsoonFish({
    id: "indian_scad", name: "印度竹筴魚", english: "Indian Scad", scientific: "Decapterus russelli",
    rarity: "common", bodyClass: "standard", spot: WINDWARD, times: ["dawn", "dusk"], weather: "rain", baits: ["bread", "cutfish"], behavior: "sprint",
    length: [16, 38], weight: [.14, .82], price: 88, difficulty: 1.14, shape: "torpedo", colors: ["#6d8e91", "#d5ceb0"],
    short: "雨幕壓低天光，竹筴魚群仍貼著迎風流線快速轉彎。",
    detail: "印度竹筴魚是熱帶沿岸常見群游魚，利用表中層水域覓食。",
    fact: "側線後段的稜鱗能保護魚體，也讓竹筴魚觸感鮮明。", tags: ["school", "windward", "rain"]
  }),
  monsoonFish({
    id: "rainbow_sardine", name: "尖吻小公魚", english: "Rainbow Sardine", scientific: "Dussumieria acuta",
    rarity: "common", bodyClass: "small", spot: WINDWARD, times: ["dawn", "day"], baits: ["bread", "shrimp"], behavior: "sprint",
    length: [10, 22], weight: [.03, .16], price: 64, difficulty: .88, shape: "slender", colors: ["#a7c7bc", "#667bb1"],
    short: "小魚側線泛出彩光，沿白浪後方最平順的一層聚集。",
    detail: "尖吻小公魚在熱帶沿岸表層結群，是大型掠食魚的重要食物。",
    fact: "密集魚群用同步轉向降低單一個體被捕食的機會。", tags: ["small", "school", "windward"]
  }),
  monsoonFish({
    id: "torpedo_scad", name: "大甲鰺", english: "Torpedo Scad", scientific: "Megalaspis cordyla",
    rarity: "common", bodyClass: "large", spot: WINDWARD, times: ["day", "dusk"], baits: ["cutfish", "shrimp"], behavior: "sprint",
    length: [26, 65], weight: [.5, 3.8], price: 112, difficulty: 1.3, shape: "torpedo", colors: ["#63818c", "#c1cab7"],
    short: "厚實銀身順著風浪疾行，拉力像迎風船頭持續推水。",
    detail: "大甲鰺是沿岸與外海的快速群游掠食魚，追逐小型魚群。",
    fact: "流線身形與深叉尾適合持續高速游動。", tags: ["large", "windward", "sprint"]
  }),
  monsoonFish({
    id: "quoys_garfish", name: "奎氏鱵", english: "Quoy's Garfish", scientific: "Hyporhamphus quoyi",
    rarity: "common", bodyClass: "small", spot: SEAGRASS, times: ["dawn", "day"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "steady",
    length: [12, 28], weight: [.04, .28], price: 70, difficulty: .96, shape: "needle", colors: ["#cbd2b0", "#5c8d87"],
    short: "細長下頜貼著平靜水面，背風灣把牠的倒影完整留住。",
    detail: "奎氏鱵多在沿岸淺水表層活動，能利用潟湖與植被鄰近水域。",
    fact: "鱵魚上下頜不等長，細長下頜是醒目特徵。", tags: ["small", "surface", "seagrass"]
  }),
  monsoonFish({
    id: "bartail_flathead", name: "印度牛尾魚", english: "Bartail Flathead", scientific: "Platycephalus indicus",
    rarity: "common", bodyClass: "large", spot: MANGROVE, times: ["dusk", "night"], baits: ["worm", "cutfish"], behavior: "steady",
    length: [24, 78], weight: [.4, 5.8], price: 106, difficulty: 1.28, shape: "flat", colors: ["#927b58", "#c3b98d"],
    short: "扁平頭部埋在河口沙泥，只剩雙眼守著淡水羽流下緣。",
    detail: "印度牛尾魚伏在沿岸與河口沙泥底，等待魚蝦靠近。",
    fact: "寬扁頭部和上位眼睛適合貼底伏擊。", tags: ["large", "bottom", "estuary", "night"]
  }),
  monsoonFish({
    id: "banded_archerfish", name: "射水魚", english: "Banded Archerfish", scientific: "Toxotes jaculatrix",
    rarity: "uncommon", bodyClass: "standard", spot: MANGROVE, times: ["day", "dusk"], weather: "rain", baits: ["bread", "shrimp"], behavior: "sprint",
    length: [12, 30], weight: [.12, .72], price: 148, difficulty: 1.32, shape: "flat", colors: ["#d8c992", "#273f46"],
    short: "黑帶魚影停在紅樹枝下，忽然向水面射出一線小水柱。",
    detail: "射水魚生活在紅樹林與半鹹河口，以射水擊落水面上方昆蟲聞名。",
    fact: "牠會補償光線穿過水面造成的折射，精準瞄準枝葉上的獵物。", tags: ["estuary", "mangrove", "rain"]
  }),
  monsoonFish({
    id: "goldsilk_seabream", name: "平鯛", english: "Goldsilk Seabream", scientific: "Acanthopagrus berda",
    rarity: "uncommon", bodyClass: "large", spot: MANGROVE, times: ["dawn", "dusk"], baits: ["shrimp", "worm"], behavior: "endurance",
    length: [22, 58], weight: [.4, 3.4], price: 176, difficulty: 1.44, shape: "flat", colors: ["#bcb78f", "#596a65"],
    short: "暗金魚身沿紅樹根外緣巡游，在鹽度較穩的一側停留。",
    detail: "平鯛常進入河口、潟湖與紅樹林，能在鹽度變動環境覓食。",
    fact: "強健臼齒能壓碎貝類與甲殼類。", tags: ["large", "estuary"]
  }),
  monsoonFish({
    id: "mangrove_red_snapper", name: "紫紅笛鯛", english: "Mangrove Red Snapper", scientific: "Lutjanus argentimaculatus",
    rarity: "uncommon", bodyClass: "large", spot: MANGROVE, times: ["dusk", "night"], baits: ["shrimp", "cutfish"], behavior: "endurance",
    length: [28, 95], weight: [.7, 11.8], price: 226, difficulty: 1.58, shape: "torpedo", colors: ["#8b3e39", "#c77b54"],
    short: "紅褐大魚從根影深處出發，沿退潮水道沉穩施力。",
    detail: "幼年紫紅笛鯛常利用紅樹林與河口作育幼場，成長後也會進入礁區。",
    fact: "紅樹根的立體縫隙為幼魚提供躲避大型掠食者的空間。", tags: ["large", "mangrove", "night"]
  }),
  monsoonFish({
    id: "orange_spotted_grouper", name: "點帶石斑魚", english: "Orange-spotted Grouper", scientific: "Epinephelus coioides",
    rarity: "uncommon", bodyClass: "large", spot: MANGROVE, times: ["dawn", "night"], weather: "rain", baits: ["shrimp", "cutfish"], behavior: "endurance",
    length: [30, 105], weight: [.9, 15], price: 248, difficulty: 1.64, shape: "round", colors: ["#9b795c", "#d36f4f"],
    short: "橙褐斑點停在渾水根部，魚身不動，胸鰭只輕輕推開淡水。",
    detail: "點帶石斑魚會利用河口、紅樹林、海草床與礁區，幼魚尤其依賴近岸遮蔽。",
    fact: "石斑魚常以短距離爆發伏擊，而不是長時間追逐。", tags: ["large", "mangrove", "rain"]
  }),
  monsoonFish({
    id: "indo_pacific_tarpon", name: "大海鰱", english: "Indo-Pacific Tarpon", scientific: "Megalops cyprinoides",
    rarity: "uncommon", bodyClass: "large", spot: MANGROVE, times: ["dusk", "night"], weather: "rain", baits: ["cutfish", "glow"], behavior: "sprint",
    length: [35, 115], weight: [1.1, 17], price: 264, difficulty: 1.72, shape: "torpedo", colors: ["#9cb6ad", "#4c6c79"],
    short: "大鱗銀身在雨後暗水翻轉，偶爾上浮吞下一口空氣。",
    detail: "大海鰱能進入河口、紅樹林與低氧潟湖，幼魚常利用受遮蔽的半鹹水。",
    fact: "特殊魚鰾可協助呼吸空氣，使牠能利用溶氧偏低的水域。", tags: ["large", "estuary", "rain", "night"]
  }),
  monsoonFish({
    id: "silver_sillago", name: "少鱗鱚", english: "Silver Sillago", scientific: "Sillago sihama",
    rarity: "uncommon", bodyClass: "standard", spot: SEAGRASS, times: ["dawn", "day"], baits: ["worm", "shrimp"], behavior: "steady",
    length: [14, 38], weight: [.1, .72], price: 142, difficulty: 1.26, shape: "slender", colors: ["#d5cfad", "#869a91"],
    short: "細銀身沿草床外的淺沙前進，背風清水把每次啄食都照得清楚。",
    detail: "少鱗鱚常在沿岸沙泥底、河口與海草附近覓食小型底棲動物。",
    fact: "細長吻部適合在柔軟海床搜尋獵物。", tags: ["seagrass", "bottom"]
  }),
  monsoonFish({
    id: "spotted_sea_catfish", name: "斑海鯰", english: "Spotted Catfish", scientific: "Arius maculatus",
    rarity: "uncommon", bodyClass: "large", spot: MANGROVE, times: ["dusk", "night"], baits: ["worm", "cutfish"], behavior: "endurance",
    length: [28, 72], weight: [.7, 5.4], price: 188, difficulty: 1.48, shape: "torpedo", colors: ["#687a78", "#c1b891"],
    short: "長鬚掃過混濁河口底部，斑點背鰭從雨水羽流下方穿出。",
    detail: "斑海鯰生活在沿岸與河口，以觸鬚在低能見度底層尋找食物。",
    fact: "部分海鯰由雄魚口孵卵，親魚會長時間保護後代。", tags: ["large", "estuary", "night"]
  }),
  monsoonFish({
    id: "blochs_gizzard_shad", name: "花鰶", english: "Bloch's Gizzard Shad", scientific: "Nematalosa nasus",
    rarity: "uncommon", bodyClass: "standard", spot: MANGROVE, times: ["dawn", "day"], weather: "rain", baits: ["bread", "shrimp"], behavior: "steady",
    length: [16, 38], weight: [.13, .82], price: 134, difficulty: 1.2, shape: "flat", colors: ["#c8c9a9", "#6f8f92"],
    short: "銀色魚群沿雨後低鹽水帶聚集，水色界線因此緩慢移動。",
    detail: "花鰶能利用沿岸與河口半鹹水，成群攝食浮游生物與碎屑。",
    fact: "砂囊狀胃能協助磨碎攝入的植物與碎屑材料。", tags: ["school", "estuary", "rain"]
  }),
  monsoonFish({
    id: "talang_queenfish", name: "康氏似鰺", english: "Talang Queenfish", scientific: "Scomberoides commersonnianus",
    rarity: "uncommon", bodyClass: "large", spot: WINDWARD, times: ["dawn", "day"], weather: "sunny", baits: ["cutfish", "glow"], behavior: "sprint",
    length: [42, 120], weight: [1.4, 15.5], price: 278, difficulty: 1.76, shape: "torpedo", colors: ["#9eb5b0", "#416d7a"],
    short: "銀身黑斑越過浪脊，迎風流越清楚，衝刺路線越筆直。",
    detail: "康氏似鰺是沿岸快速掠食魚，常追逐表層小魚群。",
    fact: "深叉尾與流線魚體能支撐強勁短程衝刺。", tags: ["large", "windward", "sprint"]
  }),
  monsoonFish({
    id: "black_pomfret", name: "烏鯧", english: "Black Pomfret", scientific: "Parastromateus niger",
    rarity: "uncommon", bodyClass: "large", spot: WINDWARD, times: ["day", "dusk"], weather: "rain", baits: ["shrimp", "cutfish"], behavior: "sway",
    length: [28, 62], weight: [.7, 4.4], price: 238, difficulty: 1.6, shape: "flat", colors: ["#445a61", "#8b9f98"],
    short: "深灰扁身側迎長浪，雨幕下像一面緩慢轉動的小帆。",
    detail: "烏鯧活動於沿岸與陸棚水域，攝食浮游動物與小型生物。",
    fact: "側扁體型使牠轉向靈活，幼魚有時會伴隨水母尋求遮蔽。", tags: ["large", "windward", "rain"]
  }),
  monsoonFish({
    id: "golden_trevally", name: "無齒鰺", english: "Golden Trevally", scientific: "Gnathanodon speciosus",
    rarity: "uncommon", bodyClass: "large", spot: WINDWARD, times: ["dawn", "dusk"], baits: ["shrimp", "cutfish"], behavior: "sprint",
    length: [30, 95], weight: [.9, 8.8], price: 252, difficulty: 1.68, shape: "torpedo", colors: ["#d6ae48", "#536d78"],
    short: "金黃幼魚穿過湧浪陰影，成魚的銀身則在外側流線閃過。",
    detail: "無齒鰺在礁區與沿岸水域活動，幼魚金黃帶紋，常依附大型動物附近。",
    fact: "幼魚可能跟隨鯊魚或其他大型動物，利用其周圍水流與庇護。", tags: ["large", "windward"]
  }),
  monsoonFish({
    id: "banded_needlefish", name: "帶鱵", english: "Banded Needlefish", scientific: "Strongylura leiura",
    rarity: "uncommon", bodyClass: "large", spot: WINDWARD, times: ["dusk", "night"], baits: ["cutfish", "glow"], behavior: "sprint",
    length: [36, 88], weight: [.45, 3.5], price: 214, difficulty: 1.58, shape: "needle", colors: ["#7d9e99", "#d0c6a1"],
    short: "長喙魚影貼著黑浪表面掠過，風把每次躍水吹成斜線。",
    detail: "帶鱵是沿岸表層掠食魚，以細長雙頜捕捉小魚。",
    fact: "鱵魚常在受驚時躍出水面，夜間燈光下需保持距離觀察。", tags: ["large", "surface", "windward", "night"]
  }),
  monsoonFish({
    id: "longspine_emperor", name: "長棘裸頰鯛", english: "Longspine Emperor", scientific: "Lethrinus genivittatus",
    rarity: "uncommon", bodyClass: "standard", spot: SEAGRASS, times: ["day", "dusk"], baits: ["shrimp", "worm"], behavior: "steady",
    length: [16, 34], weight: [.15, .78], price: 156, difficulty: 1.34, shape: "torpedo", colors: ["#c5b78c", "#716957"],
    short: "褐線魚身沿海草與沙地接縫覓食，背風水清時路徑格外完整。",
    detail: "長棘裸頰鯛利用沙地、海草床與礁區邊緣，尋找底棲無脊椎動物。",
    fact: "裸頰鯛科的吻部與牙齒適合翻找海床獵物。", tags: ["seagrass", "bottom"]
  }),
  monsoonFish({
    id: "yellowtail_barracuda", name: "黃尾金梭魚", english: "Yellowtail Barracuda", scientific: "Sphyraena flavicauda",
    rarity: "uncommon", bodyClass: "large", spot: WINDWARD, times: ["dawn", "night"], baits: ["cutfish", "glow"], behavior: "sprint",
    length: [28, 62], weight: [.5, 3.4], price: 236, difficulty: 1.64, shape: "needle", colors: ["#667f85", "#d4c35f"],
    short: "細長群影在迎風深藍處懸停，一尾出擊，整群便順浪換位。",
    detail: "黃尾金梭魚在礁區與沿岸水域成群，伏在水柱中等待小魚。",
    fact: "長身與尖齒適合突然加速捕捉魚群邊緣個體。", tags: ["large", "windward", "night"]
  }),
  monsoonFish({
    id: "barramundi", name: "尖吻鱸", english: "Barramundi", scientific: "Lates calcarifer",
    rarity: "rare", bodyClass: "gigantic", spot: MANGROVE, times: ["dusk", "night"], weather: "rain", baits: ["cutfish", "glow"], behavior: "rare",
    length: [58, 165], weight: [3.2, 45], price: 720, difficulty: 2.08, shape: "torpedo", colors: ["#9cae9f", "#4a6570"],
    short: "寬大銀身從低鹽羽流下方升起，雨聲裡只留下沉重翻水。",
    detail: "尖吻鱸生活於沿岸、河口、潟湖與河流下游，會在淡鹹水之間移動。",
    fact: "牠能適應廣泛鹽度，生命史常連結河口育幼場與海岸水域。", tags: ["rare", "gigantic", "estuary", "rain"]
  }),
  monsoonFish({
    id: "fourfinger_threadfin", name: "四指馬鮁", english: "Fourfinger Threadfin", scientific: "Eleutheronema tetradactylum",
    rarity: "rare", bodyClass: "gigantic", spot: MANGROVE, times: ["dawn", "dusk"], weather: "rain", baits: ["shrimp", "cutfish"], behavior: "rare",
    length: [52, 165], weight: [2.4, 38], price: 680, difficulty: 2, shape: "torpedo", colors: ["#bec5ae", "#7c937d"],
    short: "四枚游離胸鰭絲探過混濁海床，像替大魚摸索雨後的新岸線。",
    detail: "四指馬鮁常利用沿岸淺水、河口與沙泥底，以敏感胸鰭絲尋找獵物。",
    fact: "胸鰭下方四條游離鰭絲具有感覺功能，也是名稱來源。", tags: ["rare", "gigantic", "estuary", "rain"]
  }),
  monsoonFish({
    id: "bluespotted_ribbontail_ray", name: "藍斑條尾魟", english: "Bluespotted Ribbontail Ray", scientific: "Taeniura lymma",
    rarity: "rare", bodyClass: "large", spot: SEAGRASS, times: ["day", "dusk"], weather: "sunny", baits: ["shrimp", "worm"], behavior: "rare",
    length: [32, 70], weight: [1.1, 8.5], price: 640, difficulty: 1.92, shape: "winged", colors: ["#bb9d5f", "#3da5b8"],
    short: "亮藍圓斑滑過背風沙地，盤緣掀起的細砂很快落回草根。",
    detail: "藍斑條尾魟常見於礁坪、沙地與海草附近，白日可停在淺水底部。",
    fact: "鮮藍斑點是警示色；尾部具有防禦用毒棘，觀察時需保持距離。", tags: ["rare", "large", "seagrass"]
  }),
  monsoonFish({
    id: "cobia", name: "海鱺", english: "Cobia", scientific: "Rachycentron canadum",
    rarity: "rare", bodyClass: "gigantic", spot: WINDWARD, times: ["day", "dusk"], baits: ["cutfish", "glow"], behavior: "rare",
    length: [72, 190], weight: [5.5, 58], price: 760, difficulty: 2.12, shape: "torpedo", colors: ["#3d4b4e", "#c5b98e"],
    short: "深褐長身跟著外水漂流物越過浪線，轉身時白側帶像一道遠航記號。",
    detail: "海鱺分布廣，常在近岸至外海跟隨大型動物、漂浮物與結構覓食。",
    fact: "幼魚外觀略似鮣魚，但海鱺頭頂沒有吸盤。", tags: ["rare", "gigantic", "windward"]
  }),
  monsoonFish({
    id: "narrow_barred_spanish_mackerel", name: "康氏馬加鰆", english: "Narrow-barred Spanish Mackerel", scientific: "Scomberomorus commerson",
    rarity: "epic", bodyClass: "gigantic", spot: WINDWARD, times: ["dawn", "day"], weather: "sunny", baits: ["glow"], behavior: "rare",
    length: [88, 225], weight: [8, 72], price: 1580, difficulty: 2.44, shape: "torpedo", colors: ["#48758a", "#d4d5bd"],
    short: "狹長深帶穿過最外側白浪，魚身借長風加速，像把航線拉成一筆。",
    detail: "康氏馬加鰆是大型高速沿岸掠食魚，會在清澈外水追逐群游小魚。",
    fact: "流線體型、深叉尾和收納鰭的凹槽共同降低高速游動阻力。", tags: ["epic", "gigantic", "windward", "sprint"]
  })
];
