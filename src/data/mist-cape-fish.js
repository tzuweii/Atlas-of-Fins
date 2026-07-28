import { MIST_CAPE_COLD_CURRENT_ID } from "./regions.js";
import { fishAppearanceWeight } from "./fish-probabilities.js";

export const MIST_CAPE_FISH_COUNT = 34;

const ECOLOGY_CHECKED_AT = "2026-07-28";

const ecologySource = scientific => ({
  label: "FishBase 物種摘要",
  url: `https://www.fishbase.se/summary/${scientific.replaceAll(" ", "-")}.html`,
  checkedAt: ECOLOGY_CHECKED_AT,
  note: "依物種摘要的分布、棲地與最大體長，簡化為霧岬冷暖流交界、海藻林與深槽的遊戲化出現條件。"
});

const mistHabitat = spotIds => ({
  regionId: MIST_CAPE_COLD_CURRENT_ID,
  spotIds: [...spotIds],
  sizeScale: 1
});

const mistFish = ({
  id, name, english, scientific, rarity, bodyClass, spots, times, weather, baits, behavior,
  length, weight, price, difficulty, shape, colors, short, detail, fact, tags = []
}) => ({
  id, name, english, scientific, rarity, bodyClass,
  spots: [...spots], baits: [...baits], behavior,
  appearanceWeight: fishAppearanceWeight(id),
  preferredTimeIds: [...times],
  preferredWeatherIds: weather === "any" ? [] : [weather],
  minLength: length[0], maxLength: length[1], minWeight: weight[0], maxWeight: weight[1], basePrice: price,
  difficulty, shape, colors: [...colors], short, detail, fact, tags: [...tags],
  ecologySource: ecologySource(scientific),
  habitats: [mistHabitat(spots)]
});

export const MIST_CAPE_FISH = [
  mistFish({
    id: "pacific_herring", name: "太平洋鯡", english: "Pacific Herring", scientific: "Clupea pallasii",
    rarity: "common", bodyClass: "small", spots: ["fogfront_shelf"], times: ["dawn", "day"], weather: "any", baits: ["bread", "shrimp"], behavior: "steady",
    length: [16, 38], weight: [.08, .62], price: 64, difficulty: .9, shape: "slender", colors: ["#b8d0cb", "#5c7585"],
    short: "銀灰魚群沿著霧線整齊轉身，讓看不見的潮界短暫有了輪廓。",
    detail: "太平洋鯡常在沿岸與陸棚水域結群，取食浮游生物；牠們在冷水帶外緣聚攏時，整片魚群會像一枚移動的溫度記號。",
    fact: "鯡魚群能同步改變方向，密集的銀色反光也會干擾掠食者判斷單一個體。", tags: ["small", "school", "cold-current"]
  }),
  mistFish({
    id: "capelin", name: "毛鱗魚", english: "Capelin", scientific: "Mallotus villosus",
    rarity: "common", bodyClass: "small", spots: ["fogfront_shelf"], times: ["dawn", "dusk"], weather: "rain", baits: ["bread", "shrimp"], behavior: "sprint",
    length: [12, 25], weight: [.03, .18], price: 58, difficulty: .86, shape: "slender", colors: ["#9dc4be", "#58717b"],
    short: "細小魚身在冷霧下成群靠近，側線像沾著一層淡淡霜光。",
    detail: "毛鱗魚是北方冷水食物網的重要成員，會追隨浮游生物形成大群；雨霧讓表層水變涼時，牠們更容易靠近霧岬外緣。",
    fact: "許多海鳥、海獸與大型魚都依靠毛鱗魚群，是冷水海域把能量往上傳遞的重要一環。", tags: ["small", "school", "rain", "cold-current"]
  }),
  mistFish({
    id: "pacific_sand_lance", name: "玉筋魚", english: "Pacific Sand Lance", scientific: "Ammodytes personatus",
    rarity: "common", bodyClass: "small", spots: ["fogfront_shelf"], times: ["day", "dusk"], weather: "sunny", baits: ["bread", "worm"], behavior: "sprint",
    length: [10, 24], weight: [.03, .16], price: 62, difficulty: .92, shape: "needle", colors: ["#c9d6c4", "#718a89"],
    short: "細長魚影從陸棚沙面一齊竄出，像潮水翻開一把銀色細針。",
    detail: "玉筋魚會在沿岸沙底上方結群覓食，受到驚擾時能迅速鑽入沙中。霧線稍退的白日，最容易看清牠們離開沙面的短暫路徑。",
    fact: "玉筋魚的細長身體適合鑽沙；休息或避敵時，整群魚可能在海床下安靜消失。", tags: ["small", "school", "bottom"]
  }),
  mistFish({
    id: "pacific_jack_mackerel", name: "太平洋竹筴魚", english: "Pacific Jack Mackerel", scientific: "Trachurus symmetricus",
    rarity: "common", bodyClass: "standard", spots: ["fogfront_shelf"], times: ["day", "dusk"], weather: "any", baits: ["bread", "cutfish"], behavior: "sprint",
    length: [22, 52], weight: [.22, 1.8], price: 78, difficulty: 1.02, shape: "torpedo", colors: ["#94b7ad", "#3f6171"],
    short: "青銀魚群貼著暖水一側巡游，遇上冷舌便整齊折回。",
    detail: "太平洋竹筴魚會在近岸到外海形成魚群，追逐小魚與浮游甲殼類。牠們在潮界附近的轉向，能把水溫差畫成清楚的弧。",
    fact: "竹筴魚側線後段具有較硬的稜鱗，流線身形適合長時間巡游。", tags: ["school", "sprint", "current-front"]
  }),
  mistFish({
    id: "surf_smelt", name: "海灘胡瓜魚", english: "Surf Smelt", scientific: "Hypomesus pretiosus",
    rarity: "common", bodyClass: "small", spots: ["fogfront_shelf"], times: ["dawn", "dusk"], weather: "any", baits: ["bread", "worm"], behavior: "steady",
    length: [12, 25], weight: [.04, .2], price: 60, difficulty: .88, shape: "slender", colors: ["#c6d8cf", "#6d8ca0"],
    short: "半透明銀身沿浪腳聚集，晨昏薄光把魚群邊緣照得很柔。",
    detail: "海灘胡瓜魚生活在東北太平洋近岸，會在浪區與河口外形成魚群。牠們不追逐劇烈水流，而是沿著較穩定的淺層邊界覓食。",
    fact: "部分胡瓜魚帶有近似新鮮黃瓜的氣味，英文 smelt 則是這一群小型銀魚的通稱。", tags: ["small", "school", "coastal"]
  }),
  mistFish({
    id: "walleye_pollock", name: "黃線狹鱈", english: "Walleye Pollock", scientific: "Gadus chalcogrammus",
    rarity: "common", bodyClass: "large", spots: ["bluecold_trench"], times: ["dusk", "night"], weather: "any", baits: ["worm", "cutfish"], behavior: "endurance",
    length: [28, 78], weight: [.35, 4.8], price: 92, difficulty: 1.18, shape: "torpedo", colors: ["#9ba79d", "#58686e"],
    short: "灰綠身影沿深槽冷水緩緩上浮，眼睛先接住船燈的微光。",
    detail: "黃線狹鱈多在冷水陸棚與斜坡水域活動，會隨日夜改變深度。黃昏以後，較淺水層也可能出現牠們穩定而厚實的魚影。",
    fact: "狹鱈會形成大型魚群，也會依水溫、食物與生命階段改變活動深度。", tags: ["large", "deep", "night", "cold-current"]
  }),
  mistFish({
    id: "pacific_cod", name: "太平洋鱈", english: "Pacific Cod", scientific: "Gadus macrocephalus",
    rarity: "common", bodyClass: "large", spots: ["bluecold_trench"], times: ["dawn", "night"], weather: "rain", baits: ["worm", "cutfish"], behavior: "endurance",
    length: [32, 96], weight: [.7, 11.5], price: 104, difficulty: 1.28, shape: "torpedo", colors: ["#a4a38d", "#59685d"],
    short: "斑駁褐背貼著冷水海床移動，下頜觸鬚在沙泥上輕輕探路。",
    detail: "太平洋鱈偏好北太平洋的陸棚與陸坡底層，會取食甲殼類與魚。冷雨讓表層降溫時，牠們可能沿深槽較高的位置覓食。",
    fact: "下頜的一根觸鬚能協助太平洋鱈在昏暗海床附近搜尋食物。", tags: ["large", "deep", "bottom", "rain"]
  }),
  mistFish({
    id: "rock_greenling", name: "赤斑六線魚", english: "Rock Greenling", scientific: "Hexagrammos lagocephalus",
    rarity: "common", bodyClass: "standard", spots: ["whispering_kelp_forest"], times: ["dawn", "day"], weather: "any", baits: ["shrimp", "worm"], behavior: "sway",
    length: [18, 48], weight: [.22, 1.9], price: 82, difficulty: 1.04, shape: "spiky", colors: ["#9f755d", "#5e6e5d"],
    short: "紅褐斑紋伏在海藻根部，只有胸鰭擺動時才與岩面分開。",
    detail: "赤斑六線魚生活在北太平洋岩礁與海藻帶，會沿底部尋找甲殼類和小魚。斑駁色彩讓牠在林下碎光中很難被看見。",
    fact: "六線魚科的側線系統分成多條，能在複雜礁區感受不同方向的細小水流。", tags: ["reef", "bottom", "kelp"]
  }),
  mistFish({
    id: "kelp_greenling", name: "長身六線魚", english: "Kelp Greenling", scientific: "Hexagrammos decagrammus",
    rarity: "common", bodyClass: "standard", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "sunny", baits: ["shrimp", "worm"], behavior: "sway",
    length: [22, 54], weight: [.3, 2.5], price: 88, difficulty: 1.08, shape: "spiky", colors: ["#7f8a67", "#b07b59"],
    short: "橄欖與銹紅斑點掠過海藻莖間，像林下緩慢移動的影子。",
    detail: "長身六線魚常見於岩礁、海藻床與海藻林邊緣，會在底部與中層之間活動。不同體色都能融入海藻與礁石的斑駁背景。",
    fact: "雄魚與雌魚常呈現不同色彩和斑紋，卻共享同一片海藻林的遮蔽。", tags: ["reef", "kelp"]
  }),
  mistFish({
    id: "kelp_perch", name: "海藻眶鋸雀鯛", english: "Kelp Perch", scientific: "Brachyistius frenatus",
    rarity: "common", bodyClass: "small", spots: ["whispering_kelp_forest"], times: ["day"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "sway",
    length: [8, 18], weight: [.04, .24], price: 66, difficulty: .9, shape: "flat", colors: ["#9c9a58", "#4f6d58"],
    short: "橄欖小魚貼著海藻葉片停留，葉面一轉，牠也跟著換到陰影裡。",
    detail: "海藻眶鋸雀鯛高度依賴海藻林，在葉片與莖幹附近取食小型無脊椎動物。牠的活動範圍不大，卻能細緻利用林中的每一層。",
    fact: "海藻眶鋸雀鯛會直接生下幼魚，幼魚很快便能進入海藻提供的立體遮蔽。", tags: ["small", "kelp"]
  }),
  mistFish({
    id: "opaleye", name: "藍眼海鯽", english: "Opaleye", scientific: "Girella nigricans",
    rarity: "common", bodyClass: "standard", spots: ["fogfront_shelf"], times: ["day", "dusk"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "steady",
    length: [18, 48], weight: [.25, 2.2], price: 86, difficulty: 1.06, shape: "flat", colors: ["#71887a", "#72b9b2"],
    short: "深灰魚身托著一雙藍綠眼睛，沿較暖的水色慢慢啄食。",
    detail: "藍眼海鯽多活動於岩礁與海藻區，成魚以藻類為主食。牠們在霧岬偏暖的一側出現，讓潮界不只是一條冷水線。",
    fact: "明亮藍綠色眼睛是藍眼海鯽最容易辨認的特徵，離開水面反而不如水中醒目。", tags: ["reef", "current-front"]
  }),
  mistFish({
    id: "senorita_wrasse", name: "加州隆頭魚", english: "Senorita", scientific: "Oxyjulis californica",
    rarity: "common", bodyClass: "small", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "any", baits: ["shrimp"], behavior: "sprint",
    length: [10, 25], weight: [.05, .28], price: 72, difficulty: .98, shape: "slender", colors: ["#9d815c", "#d6b466"],
    short: "細長金褐身影在海藻林中快速穿針，偶爾停在大魚身旁啄食。",
    detail: "加州隆頭魚常在岩礁與海藻林活動，會取食小型無脊椎動物，也可能替較大的魚清理體表。牠在林中的短促往返像一枚活的梭子。",
    fact: "部分加州隆頭魚會形成清潔站，讓其他魚暫停游動、接受牠們移除體表寄生物。", tags: ["small", "sprint", "kelp"]
  }),
  mistFish({
    id: "tubesnout", name: "管吻魚", english: "Tubesnout", scientific: "Aulorhynchus flavidus",
    rarity: "common", bodyClass: "small", spots: ["whispering_kelp_forest"], times: ["dawn", "day"], weather: "rain", baits: ["bread", "shrimp"], behavior: "sway",
    length: [10, 19], weight: [.03, .14], price: 68, difficulty: .94, shape: "needle", colors: ["#9ab19e", "#526b68"],
    short: "針狀小魚直立在海藻細枝旁，霧雨落下時幾乎成了另一段莖。",
    detail: "管吻魚生活在東北太平洋近岸，常與海藻床和海草帶相連。細長吻部適合啄食小型浮游與底棲生物，群體會在植被間緩慢移動。",
    fact: "雄性管吻魚會用腎臟分泌物把植物材料黏成巢，並守護附著其中的魚卵。", tags: ["small", "kelp", "rain"]
  }),
  mistFish({
    id: "pacific_tomcod", name: "太平洋小鱈", english: "Pacific Tomcod", scientific: "Microgadus proximus",
    rarity: "common", bodyClass: "standard", spots: ["bluecold_trench"], times: ["dusk", "night"], weather: "rain", baits: ["worm", "cutfish"], behavior: "steady",
    length: [18, 38], weight: [.14, .75], price: 84, difficulty: 1.04, shape: "torpedo", colors: ["#9f9b82", "#59645f"],
    short: "褐灰小鱈沿深槽邊緣成群覓食，下頜短鬚不時碰觸海床。",
    detail: "太平洋小鱈棲息於沿岸與陸棚底層，能進入較淺的海灣與河口。牠們在低光冷水裡活動，穩定的拉力很適合辨認深槽節奏。",
    fact: "太平洋小鱈體型不大，卻和大型鱈魚一樣具有下頜觸鬚與多枚背鰭。", tags: ["bottom", "night", "rain"]
  }),
  mistFish({
    id: "shiner_perch", name: "閃光海鯽", english: "Shiner Perch", scientific: "Cymatogaster aggregata",
    rarity: "common", bodyClass: "small", spots: ["fogfront_shelf"], times: ["dawn", "day"], weather: "any", baits: ["bread", "shrimp"], behavior: "steady",
    length: [7, 18], weight: [.02, .18], price: 62, difficulty: .86, shape: "flat", colors: ["#c0c9b8", "#7e9b9e"],
    short: "小魚群在霧下閃出細碎銀光，貼著陸棚最平緩的水層前進。",
    detail: "閃光海鯽常見於近岸、碼頭與海藻帶，會結成小群取食浮游與底棲生物。牠們能容納不同水況，是潮界兩側都可靠的日常記錄。",
    fact: "海鯽類多為胎生，幼魚出生時已具有能自行游動與覓食的完整外形。", tags: ["small", "school", "coastal"]
  }),
  mistFish({
    id: "halfmoon", name: "半月海鯽", english: "Halfmoon", scientific: "Medialuna californiensis",
    rarity: "common", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "endurance",
    length: [24, 52], weight: [.45, 3.1], price: 96, difficulty: 1.16, shape: "flat", colors: ["#667b82", "#adc4b8"],
    short: "深藍灰魚身在林緣排成疏鬆小群，尾鰭彎出柔和半月。",
    detail: "半月海鯽生活在岩礁與海藻林，會取食藻類及小型無脊椎動物。牠們常沿林冠與開水交界活動，是辨認棲地邊緣的好線索。",
    fact: "半月海鯽的英文名來自尾鰭輪廓；牠們常以小群在海藻林上方穩定巡游。", tags: ["large", "kelp", "school"]
  }),
  mistFish({
    id: "lingcod", name: "長蛇齒單線魚", english: "Lingcod", scientific: "Ophiodon elongatus",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["dawn", "dusk"], weather: "any", baits: ["cutfish", "worm"], behavior: "endurance",
    length: [45, 128], weight: [1.8, 30], price: 210, difficulty: 1.54, shape: "torpedo", colors: ["#657665", "#394e4a"],
    short: "長身伏在岩礁與海藻根部，張口時才顯出藏在陰影裡的力量。",
    detail: "長蛇齒單線魚是東北太平洋岩礁與海藻林的重要掠食者，常停在底部等待魚與頭足類靠近。上鉤後會以厚實身體持續施力。",
    fact: "牠雖名為 lingcod，並不是真正的鱈魚；寬大的口與銳齒更接近伏擊型礁區掠食者。", tags: ["large", "reef", "kelp", "predator"]
  }),
  mistFish({
    id: "cabezon", name: "大頭杜父魚", english: "Cabezon", scientific: "Scorpaenichthys marmoratus",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "rain", baits: ["shrimp", "worm"], behavior: "endurance",
    length: [28, 82], weight: [.8, 11.3], price: 188, difficulty: 1.42, shape: "spiky", colors: ["#795f4e", "#4c6657"],
    short: "寬大頭部與葉狀皮瓣藏在礁面，雨霧讓牠的輪廓更加安靜。",
    detail: "大頭杜父魚棲息於岩礁、潮池與海藻林底部，擅長以斑駁體色伏擊甲殼類和魚。牠不長距離追逐，力量卻沉穩厚實。",
    fact: "大頭杜父魚沒有魚鱗，皮膚上的斑紋和突起能讓牠看起來像一塊覆著海藻的岩石。", tags: ["large", "bottom", "kelp", "rain"]
  }),
  mistFish({
    id: "wolf_eel", name: "狼鰻", english: "Wolf-eel", scientific: "Anarrhichthys ocellatus",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["dusk", "night"], weather: "any", baits: ["cutfish", "worm"], behavior: "endurance",
    length: [55, 210], weight: [2.2, 18.5], price: 238, difficulty: 1.62, shape: "ribbon", colors: ["#6b7064", "#394a50"],
    short: "灰長身從礁洞探出圓鈍頭部，海藻影在牠背上緩慢移動。",
    detail: "狼鰻生活在北太平洋岩礁洞穴，成年個體常長期使用熟悉的住處，以強健牙齒取食海膽、蟹與硬殼生物。",
    fact: "狼鰻不是鰻魚，而是狼魚科的長身魚；成對個體可能共同守護洞穴與魚卵。", tags: ["large", "night", "reef"]
  }),
  mistFish({
    id: "china_rockfish", name: "雲斑平鮋", english: "China Rockfish", scientific: "Sebastes nebulosus",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["dawn", "night"], weather: "any", baits: ["shrimp", "worm"], behavior: "sway",
    length: [22, 45], weight: [.45, 2.4], price: 176, difficulty: 1.38, shape: "spiky", colors: ["#2f3c42", "#d5b65a"],
    short: "黑黃雲斑在岩縫口一明一滅，幾乎不離開熟悉的林下住處。",
    detail: "雲斑平鮋偏好有洞穴與海藻遮蔽的岩礁，活動範圍通常不大。黑底黃斑像海藻林裡被切碎的光，適合伏在礁面等待食物。",
    fact: "許多平鮋不像一般魚類產下魚卵，而是讓胚胎在體內發育後產出仔魚。", tags: ["large", "reef", "night"]
  }),
  mistFish({
    id: "kelp_rockfish", name: "海藻平鮋", english: "Kelp Rockfish", scientific: "Sebastes atrovirens",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "sunny", baits: ["shrimp", "cutfish"], behavior: "sway",
    length: [20, 42], weight: [.38, 1.9], price: 168, difficulty: 1.34, shape: "spiky", colors: ["#74734f", "#3d594f"],
    short: "褐綠身影停在海藻莖旁，葉片傾斜時才向另一根莖慢慢移動。",
    detail: "海藻平鮋終年依賴海藻林與岩礁結構，常在水柱中維持固定位置。牠把林中的莖、陰影與緩流都當成可以停靠的房間。",
    fact: "海藻平鮋常呈頭高尾低的姿勢懸停，能用很少的移動留在海藻莖間。", tags: ["large", "kelp"]
  }),
  mistFish({
    id: "pacific_bonito", name: "太平洋鰹", english: "Pacific Bonito", scientific: "Sarda chiliensis",
    rarity: "uncommon", bodyClass: "large", spots: ["fogfront_shelf"], times: ["day", "dusk"], weather: "sunny", baits: ["cutfish", "glow"], behavior: "sprint",
    length: [42, 102], weight: [1.5, 11.8], price: 224, difficulty: 1.58, shape: "torpedo", colors: ["#537985", "#b5c6b8"],
    short: "斜紋魚背從偏暖水色掠過，接近冷舌時迅速轉向外海。",
    detail: "太平洋鰹是快速游動的近海掠食魚，會追逐小魚群。牠在霧岬暖水側短暫出現，使玩家能用同一片陸棚比較冷暖魚群。",
    fact: "強健尾柄與流線身形讓太平洋鰹能持續高速游動，背部斜紋是醒目辨識特徵。", tags: ["large", "sprint", "current-front"]
  }),
  mistFish({
    id: "sablefish", name: "裸蓋魚", english: "Sablefish", scientific: "Anoplopoma fimbria",
    rarity: "uncommon", bodyClass: "large", spots: ["bluecold_trench"], times: ["dusk", "night"], weather: "any", baits: ["cutfish", "glow"], behavior: "endurance",
    length: [45, 120], weight: [1.5, 25], price: 252, difficulty: 1.66, shape: "torpedo", colors: ["#424f56", "#71827c"],
    short: "墨灰身影沿深槽緩慢巡游，船燈只照亮一小段柔滑背線。",
    detail: "裸蓋魚多生活在北太平洋較深的陸坡與海底峽谷，幼魚則可能在較淺沿岸活動。牠適應冷暗水層，拉力綿長而穩定。",
    fact: "裸蓋魚壽命很長，部分個體可活過數十年，因此每一尾大型成魚都保存著漫長海況。", tags: ["large", "deep", "night"]
  }),
  mistFish({
    id: "pacific_halibut", name: "太平洋大比目魚", english: "Pacific Halibut", scientific: "Hippoglossus stenolepis",
    rarity: "uncommon", bodyClass: "large", spots: ["bluecold_trench"], times: ["dawn", "day"], weather: "rain", baits: ["worm", "cutfish"], behavior: "endurance",
    length: [48, 180], weight: [2.4, 82], price: 268, difficulty: 1.7, shape: "flat", colors: ["#847761", "#d0c5a6"],
    short: "寬扁身體覆著沙泥色斑，一抬離海床便像整片底色開始移動。",
    detail: "太平洋大比目魚棲息於北太平洋陸棚與陸坡沙泥底，會伏底等待魚與甲殼類。牠的重量帶來持續拉力，而非頻繁衝刺。",
    fact: "幼魚起初左右對稱，成長時一側眼睛會移到另一側，最後以同一面朝上生活。", tags: ["large", "bottom", "deep", "rain"]
  }),
  mistFish({
    id: "spotted_ratfish", name: "斑點銀鮫", english: "Spotted Ratfish", scientific: "Hydrolagus colliei",
    rarity: "uncommon", bodyClass: "large", spots: ["bluecold_trench"], times: ["night"], weather: "any", baits: ["worm", "glow"], behavior: "sway",
    length: [28, 96], weight: [.5, 3.4], price: 242, difficulty: 1.58, shape: "winged", colors: ["#8a8aa0", "#d9c9a2"],
    short: "銀紫魚身張開寬大胸鰭，長尾在深槽黑水裡像一筆尚未收尾的線。",
    detail: "斑點銀鮫是軟骨魚，常在東北太平洋海床附近活動，以貝類、甲殼類與其他底棲生物為食。夜間更容易沿較淺的深槽邊緣出現。",
    fact: "銀鮫與鯊魚、鰩魚同屬軟骨魚類，但演化支系很早便分開，輪廓也格外獨特。", tags: ["large", "deep", "night"]
  }),
  mistFish({
    id: "buffalo_sculpin", name: "野牛杜父魚", english: "Buffalo Sculpin", scientific: "Enophrys bison",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["dawn", "night"], weather: "rain", baits: ["shrimp", "worm"], behavior: "sway",
    length: [20, 38], weight: [.28, 1.4], price: 158, difficulty: 1.3, shape: "spiky", colors: ["#805c4b", "#536957"],
    short: "角狀棘突與紅褐斑紋伏在海藻根部，像一塊長出呼吸的礁石。",
    detail: "野牛杜父魚生活在岩礁、海藻床與潮池，會以偽裝等待小型魚蝦。冷雨下的暗色海床讓牠更容易離開原來的陰影。",
    fact: "頭部棘突讓牠得到 buffalo 的英文名；寬大胸鰭則能穩定貼在有浪的底部。", tags: ["large", "bottom", "rain"]
  }),
  mistFish({
    id: "painted_greenling", name: "彩繪六線魚", english: "Painted Greenling", scientific: "Oxylebius pictus",
    rarity: "uncommon", bodyClass: "standard", spots: ["whispering_kelp_forest"], times: ["day", "dusk"], weather: "sunny", baits: ["shrimp", "worm"], behavior: "sway",
    length: [12, 24], weight: [.08, .42], price: 148, difficulty: 1.22, shape: "spiky", colors: ["#efe5c8", "#b24d45"],
    short: "奶白魚身排著紅褐直帶，穿過海藻林時像一枚被水推動的小旗。",
    detail: "彩繪六線魚棲息於岩礁與海藻區，會利用海葵周邊的立體遮蔽。鮮明色帶在林下碎光中仍清楚可辨。",
    fact: "彩繪六線魚有時會躲進大型海葵觸手之間，利用一般魚類不敢靠近的空間避敵。", tags: ["reef", "kelp"]
  }),
  mistFish({
    id: "blacksmith", name: "鐵匠雀鯛", english: "Blacksmith", scientific: "Chromis punctipinnis",
    rarity: "uncommon", bodyClass: "standard", spots: ["fogfront_shelf"], times: ["day", "dusk"], weather: "sunny", baits: ["bread", "shrimp"], behavior: "steady",
    length: [16, 30], weight: [.16, .72], price: 142, difficulty: 1.2, shape: "flat", colors: ["#56666f", "#92a7a3"],
    short: "灰黑魚群懸在偏暖水層，像一簇細小鐵屑隨流向同時傾斜。",
    detail: "鐵匠雀鯛在較溫暖的岩礁與海藻林上方形成魚群，取食浮游生物。牠們偶爾沿潮界進入霧岬，標示暖水向北伸出的範圍。",
    fact: "名稱來自深灰體色；繁殖時雄魚會守護附著在礁面的魚卵並持續替牠們換水。", tags: ["school", "current-front"]
  }),
  mistFish({
    id: "california_sheephead", name: "加州羊頭魚", english: "California Sheephead", scientific: "Semicossyphus pulcher",
    rarity: "uncommon", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["day"], weather: "sunny", baits: ["shrimp", "worm"], behavior: "endurance",
    length: [28, 90], weight: [.8, 16], price: 258, difficulty: 1.64, shape: "round", colors: ["#6f3942", "#d4c5a7"],
    short: "黑紅厚身沿海藻林偏暖邊緣巡游，額頭與下頜在碎光裡格外清楚。",
    detail: "加州羊頭魚生活於溫帶岩礁和海藻林，以海膽、蟹與貝類為食。牠在暖流較強的日子靠近霧岬，讓同一座林出現不同訪客。",
    fact: "加州羊頭魚會隨生命階段改變性別與體色，大型雄魚具有深色頭尾和紅色身軀。", tags: ["large", "kelp", "current-front"]
  }),
  mistFish({
    id: "giant_sea_bass", name: "巨堅鱗鱸", english: "Giant Sea Bass", scientific: "Stereolepis gigas",
    rarity: "rare", bodyClass: "gigantic", spots: ["whispering_kelp_forest"], times: ["dusk"], weather: "sunny", baits: ["cutfish", "glow"], behavior: "rare",
    length: [92, 210], weight: [18, 180], price: 720, difficulty: 2.02, shape: "round", colors: ["#455054", "#8f8b76"],
    short: "巨大的灰黑輪廓從海藻林外緣慢慢轉身，四周小魚沒有立刻散開。",
    detail: "巨堅鱗鱸是大型岩礁與海藻林魚類，偏好較溫暖水域。牠只在暖流伸入林緣時短暫現身，成為冷暖交界最有重量的一筆。",
    fact: "巨堅鱗鱸生長緩慢且壽命很長，成年個體可能超過兩公尺。", tags: ["rare", "gigantic", "kelp", "current-front"]
  }),
  mistFish({
    id: "yelloweye_rockfish", name: "黃眼平鮋", english: "Yelloweye Rockfish", scientific: "Sebastes ruberrimus",
    rarity: "rare", bodyClass: "large", spots: ["whispering_kelp_forest"], times: ["dawn", "night"], weather: "rain", baits: ["cutfish", "glow"], behavior: "rare",
    length: [48, 92], weight: [2.4, 10.6], price: 640, difficulty: 1.9, shape: "spiky", colors: ["#c75f45", "#e4c35f"],
    short: "橙紅身影停在林下深礁，亮黃眼睛先從冷暗水裡辨認出船燈。",
    detail: "黃眼平鮋棲息在北太平洋岩礁與較深海底，成魚常長期使用結構複雜的住處。牠的慢速生長與長壽使每次相遇都值得放慢。",
    fact: "黃眼平鮋可活超過一百年；鮮黃色眼睛和橙紅身體會隨年齡更加醒目。", tags: ["rare", "large", "reef", "night", "rain"]
  }),
  mistFish({
    id: "bluntnose_sixgill_shark", name: "灰六鰓鯊", english: "Bluntnose Sixgill Shark", scientific: "Hexanchus griseus",
    rarity: "rare", bodyClass: "gigantic", spots: ["bluecold_trench"], times: ["night"], weather: "rain", baits: ["cutfish", "glow"], behavior: "rare",
    length: [160, 420], weight: [35, 520], price: 880, difficulty: 2.18, shape: "torpedo", colors: ["#4b5963", "#87969a"],
    short: "寬厚深色背影沿槽壁抬升，六道鰓裂在轉身時短暫掠過冷光。",
    detail: "灰六鰓鯊多生活在深海與陸坡，夜間可能進入較淺水層。霧岬只把牠放在最深的冷水槽，不要求主線玩家追逐這次稀有相遇。",
    fact: "多數現生鯊魚有五對鰓裂，灰六鰓鯊保留六對，是辨認這條古老支系的重要特徵。", tags: ["rare", "gigantic", "deep", "night", "rain"]
  }),
  mistFish({
    id: "ocean_sunfish", name: "翻車魨", english: "Ocean Sunfish", scientific: "Mola mola",
    rarity: "rare", bodyClass: "gigantic", spots: ["fogfront_shelf"], times: ["day"], weather: "sunny", baits: ["cutfish", "glow"], behavior: "rare",
    length: [90, 240], weight: [18, 480], price: 820, difficulty: 2.08, shape: "flat", colors: ["#8b9797", "#c2c7b7"],
    short: "高而扁的巨大魚身側躺在霧線外，像一枚被日光暖過的灰色月亮。",
    detail: "翻車魨廣泛分布於溫帶與熱帶外海，也會沿生產力高的水團交界覓食。晴日水面較暖時，牠偶爾停在霧岬前緣。",
    fact: "翻車魨尾部不是一般尾鰭，而是由背鰭與臀鰭後端形成的舵狀構造。", tags: ["rare", "gigantic", "current-front"]
  }),
  mistFish({
    id: "basking_shark", name: "象鮫", english: "Basking Shark", scientific: "Cetorhinus maximus",
    rarity: "epic", bodyClass: "gigantic", spots: ["fogfront_shelf"], times: ["dawn", "day"], weather: "sunny", baits: ["glow"], behavior: "rare",
    length: [320, 760], weight: [420, 4200], price: 1600, difficulty: 2.42, shape: "torpedo", colors: ["#49575b", "#8a9994"],
    short: "巨大的身影張口穿過潮界，沒有追逐任何魚，只讓富含浮游生物的水緩慢流過。",
    detail: "象鮫是以浮游生物為食的大型鯊魚，會在獵物密度高、葉綠素豐富的水域與溫度鋒面聚集。牠是第三章首次開放的史詩魚，完整收藏仍為自願。",
    fact: "象鮫是世界第二大的魚，卻主要濾食微小浮游生物；張開的大口是進食，不是威嚇。", tags: ["epic", "gigantic", "plankton", "current-front"]
  })
];
