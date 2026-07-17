import { validateContentCatalog } from "./data/content-validation.js";
import { DAILY_GOAL_TEMPLATES, QUEST_TEMPLATES } from "./data/daily-goals.js";
import { COMMISSION_TEMPLATES, commissionTemplateById, getResidentCommissionTemplates } from "./data/commissions.js";
import {
  FISH_MARKET_OWNER_ID, LIGHTHOUSE_KEEPER_ID, RESIDENTS, getRegionResidents, residentById
} from "./data/residents.js";
import {
  LUMINOUS_ARCHIPELAGO_ID, REGIONS, REGION_SPOTS, SLEEPING_TIDE_BAY_ID, SPOTS,
  getFishHabitat, getRegionFish, getRegionSpots, isRegionAvailable, regionById, regionSpotById
} from "./data/regions.js";
import {
  ROUTES, SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, getRouteDestination, getRoutesForRegion,
  isRouteAvailable, routeById
} from "./data/routes.js";

export {
  COMMISSION_TEMPLATES, DAILY_GOAL_TEMPLATES, FISH_MARKET_OWNER_ID, LIGHTHOUSE_KEEPER_ID,
  QUEST_TEMPLATES, RESIDENTS, commissionTemplateById, getRegionResidents, getResidentCommissionTemplates,
  LUMINOUS_ARCHIPELAGO_ID, REGIONS, REGION_SPOTS, ROUTES, SLEEPING_TIDE_BAY_ID,
  SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID, SPOTS, getFishHabitat, getRegionFish,
  getRegionSpots, getRouteDestination, getRoutesForRegion, isRegionAvailable,
  isRouteAvailable, regionById, regionSpotById, residentById, routeById
};

export const TIMES = [
  { id: "dawn", name: "清晨", icon: "◒", line: "晨霧正沿著海面慢慢散去" },
  { id: "day", name: "白天", icon: "☀", line: "陽光在波紋上撒下碎金" },
  { id: "dusk", name: "黃昏", icon: "◐", line: "晚霞把海灣染成溫柔的橘紅" },
  { id: "night", name: "夜晚", icon: "☾", line: "船燈與星光在深藍海面相映" }
];

export const RODS = [
  { id: "wood", name: "初學者木竿", price: 0, tolerance: 0.3, reelSpeed: 0.095, rareBonus: 0, deep: false, description: "樸實可靠，安全區寬廣，適合在近岸慢慢熟悉海洋。" },
  { id: "light", name: "輕型海釣竿", price: 520, tolerance: 0.38, reelSpeed: 0.12, rareBonus: 0.18, deep: false, unlockDiscoveries: 4, description: "靈活而穩定，擴大張力安全區並提高少見魚的機會。" },
  { id: "farcast", name: "強化遠投竿", price: 1480, tolerance: 0.44, reelSpeed: 0.145, rareBonus: 0.42, deep: true, unlockDiscoveries: 10, description: "能抵達海灣深處，對衝刺型魚也有更從容的控制力。" }
];

export const BAITS = [
  { id: "bread", name: "麵包糰", icon: "●", price: 18, amount: 5, bite: 0.74, tags: ["common", "shore"], description: "便宜又親切，近岸魚群的日常點心。" },
  { id: "shrimp", name: "小蝦", icon: "⌇", price: 38, amount: 4, bite: 0.9, tags: ["reef", "uncommon"], description: "礁石魚的最愛，少見魚權重提高。" },
  { id: "worm", name: "沙蠶", icon: "∿", price: 34, amount: 4, bite: 0.94, tags: ["bottom", "night"], description: "適合底棲魚，夜間效果更好。" },
  { id: "cutfish", name: "小魚切片", icon: "◆", price: 56, amount: 3, bite: 1.05, tags: ["large", "sprint"], description: "香氣濃厚，容易吸引大型與衝刺型魚。" },
  { id: "glow", name: "發光魚餌", icon: "✦", price: 98, amount: 3, bite: 1.05, tags: ["rare", "night", "rain"], unlockDiscoveries: 8, description: "在夜晚與雨幕中散發微光，稀有魚權重提高。" }
];

export const FURNITURE = [
  { id: "sleeping_bag", name: "基礎睡袋", icon: "▱", price: 0, slot: "sleep", starter: true, description: "陪你開始旅程的舊睡袋，可以安心睡到下一個時段。" },
  { id: "blanket", name: "厚毛毯", icon: "▥", price: 160, slot: "sleep", description: "把海風吹不走的暖意收進每一針裡。" },
  { id: "bed", name: "木製床架", icon: "▰", price: 480, slot: "sleep", unlockDiscoveries: 6, description: "穩固的床架，讓船屋真正有了家的模樣。" },
  { id: "lantern", name: "暖色提燈", icon: "♢", price: 130, slot: "light", description: "像一顆小太陽，在雨夜裡尤其溫暖。" },
  { id: "bookshelf", name: "小型書架", icon: "▥", price: 320, slot: "wall", unlockDiscoveries: 5, description: "收著潮汐筆記與手繪魚類觀察簿。" },
  { id: "photos", name: "照片牆", icon: "▦", price: 240, slot: "wall", description: "將航程裡值得記得的片刻留在牆上。" },
  { id: "tea", name: "茶壺與杯組", icon: "♨", price: 190, slot: "table", description: "一杯熱茶，讓等雨停也成為一件好事。" },
  { id: "plant", name: "小型盆栽", icon: "♧", price: 210, slot: "corner", description: "耐鹽的小綠意，隨船身輕輕搖晃。" },
  { id: "fish_charm", name: "魚形掛飾", icon: "><>", price: 0, slot: "wall", milestone: 5, description: "發現五種魚的紀念，海風來時會輕聲相碰。" },
  { id: "radio", name: "收音機", icon: "▣", price: 580, slot: "table", unlockDiscoveries: 12, description: "播放海灣電台，為獨處的夜晚添一點陪伴。" }
];

const fish = (id, name, english, rarity, spots, times, weather, baits, behavior, length, weight, price, difficulty, shape, colors, short, detail, fact, tags = []) => ({
  id, name, english, scientific: "灣區觀察紀錄", rarity, spots, times, weather, baits, behavior,
  minLength: length[0], maxLength: length[1], minWeight: weight[0], maxWeight: weight[1], basePrice: price,
  difficulty, shape, colors, short, detail, fact, tags,
  habitats: [{
    regionId: SLEEPING_TIDE_BAY_ID,
    spotIds: [...spots],
    timeIds: [...times],
    weatherIds: weather === "any" ? ["sunny", "rain"] : [weather],
    baseWeight: 1,
    sizeScale: 1
  }]
});

export const FISH = [
  fish("sardine", "沙丁魚", "Sardine", "common", ["shore"], ["dawn","day"], "any", ["bread"], "steady", [12,24], [0.08,0.28], 28, .72, "slender", ["#b9d8d6","#688fa4"], "銀藍身影成群閃爍，是海灣最親切的初次相遇。", "沙丁魚喜歡群游，常在近岸追逐浮游生物。牠們轉身時，整片魚群會像被風吹動的銀色布匹。", "一群沙丁魚可以在同一瞬間改變方向，默契得像共用一個念頭。", ["small"]),
  fish("mackerel", "鯖魚", "Mackerel", "common", ["shore","reef"], ["day","dusk"], "any", ["bread","cutfish"], "sprint", [20,38], [.25,.72], 42, .86, "torpedo", ["#75a8a3","#274f63"], "背上的波紋像海風寫下的短句，游動迅捷有力。", "鯖魚身形流線，擅長快速游動。白天常追著小魚群穿過海灣，偶爾會突然衝刺拉緊魚線。", "鯖魚背部的深色花紋能在海面斑駁光影中幫助牠隱藏。", ["sprint"]),
  fish("anchovy", "鯷魚", "Anchovy", "common", ["shore"], ["dawn","day","dusk"], "any", ["bread"], "steady", [8,17], [.03,.13], 22, .62, "slender", ["#d9e5cf","#7397a0"], "小巧透明的身體映著晨光，總在近岸結伴旅行。", "鯷魚體型雖小，卻是海灣食物網的重要成員。清晨時，常能看見牠們靠近溫暖的淺水區。", "鯷魚張開嘴游泳時，會把水中的微小食物一起濾入口中。", ["small"]),
  fish("mullet", "豆仔魚", "Grey Mullet", "common", ["shore"], ["day","dusk"], "sunny", ["bread","worm"], "steady", [22,46], [.35,1.2], 48, .78, "round", ["#b9c7a0","#657a72"], "圓潤的灰綠身影貼著淺灘，悠閒尋找細小食物。", "豆仔魚常在港灣與淺灘活動，能適應水質與鹽度的變化。牠們喜歡在底部慢慢啄食。", "受驚的豆仔魚有時會一齊躍出水面，像海面突然灑出一把銀豆。", ["bottom"]),
  fish("milkfish", "虱目魚", "Milkfish", "common", ["shore","deep"], ["dawn","day"], "sunny", ["bread","worm"], "endurance", [28,58], [.45,1.8], 58, .94, "torpedo", ["#d8ded2","#73949c"], "修長銀身安靜穿過水面下方，耐力比外表更加出色。", "虱目魚有著俐落的分叉尾鰭，善於長時間游動。海灣清晨是牠們覓食最活躍的時刻。", "牠的英文名 Milkfish 並不是因為會產奶，而是來自銀白柔和的體色。", ["large"]),
  fish("grouper_juvenile", "石斑幼魚", "Juvenile Grouper", "common", ["shore","reef"], ["dawn","dusk"], "any", ["shrimp","worm"], "sway", [15,29], [.18,.62], 54, .98, "round", ["#b68f63","#5d4d45"], "斑駁花紋藏在石縫陰影裡，靠近時才會悄悄現身。", "幼年的石斑魚偏好躲在礁石與海草之間。牠們會耐心等待小型獵物靠近，再短距離出擊。", "石斑魚的斑紋如同天然迷彩，離開石縫後反而更容易被看見。", ["bottom"]),
  fish("damselfish", "雀鯛", "Damselfish", "common", ["reef"], ["day"], "sunny", ["shrimp","bread"], "sway", [9,18], [.06,.22], 38, .82, "round", ["#e7c45d","#4b83a2"], "小小身軀披著明亮色彩，是礁石花園裡忙碌的守衛。", "雀鯛會在熟悉的小範圍內活動，勇敢守護自己的領地。鮮明體色讓牠在礁石間格外醒目。", "即使面對比自己大許多的訪客，雀鯛也可能鼓起勇氣把對方趕走。", ["small","reef"]),
  fish("wrasse", "隆頭魚", "Wrasse", "common", ["reef"], ["dawn","day"], "any", ["shrimp"], "sway", [14,31], [.16,.68], 46, .92, "round", ["#55a998","#d98565"], "綠橘色帶隨游動變換光澤，穿梭礁縫像一把梭子。", "隆頭魚擁有厚實嘴唇，會在礁石表面尋找小型甲殼動物。白天比夜間活躍許多。", "有些隆頭魚入睡前會鑽進沙裡，只留下幾乎看不見的呼吸痕跡。", ["reef"]),
  fish("parrotfish", "鸚哥魚", "Parrotfish", "common", ["reef"], ["day"], "sunny", ["shrimp","bread"], "endurance", [24,52], [.55,2.1], 68, 1.05, "flat", ["#3bb5a1","#df7181"], "藍綠鱗片像流動的彩窗，喙狀嘴在礁石上留下聲響。", "鸚哥魚以堅固的喙狀齒板刮取礁石上的藻類。繽紛體色與圓鈍頭型讓牠非常容易辨認。", "牠們啃下的珊瑚碎屑經消化後會成為細沙，是沙灘形成的小小功臣。", ["large","reef"]),
  fish("black_bream", "黑鯛", "Black Seabream", "uncommon", ["reef","deep"], ["dawn","dusk"], "rain", ["shrimp","worm"], "endurance", [25,48], [.65,2.2], 108, 1.12, "flat", ["#7b8581","#303f49"], "銀灰魚身帶著沉穩黑鰭，雨前常靠近礁石邊緣覓食。", "黑鯛警覺性高，喜歡礁石、沙泥交界與有遮蔽物的水域。細雨時水色變暗，牠會更放心靠近。", "黑鯛有強健的臼齒，能咬碎貝類與甲殼，是礁區裡沉著的覓食者。", ["bottom","large"]),
  fish("scorpionfish", "石狗公", "Scorpionfish", "uncommon", ["reef"], ["dusk","night"], "any", ["shrimp","worm"], "sway", [14,29], [.22,.82], 116, 1.18, "spiky", ["#bb5e45","#68463d"], "粗獷輪廓與斑駁紅褐色，靜止時幾乎和礁石融為一體。", "石狗公擅長偽裝，常靜伏於岩礁底部。牠不愛長距離追逐，而會等待獵物來到眼前。", "越是安靜不動，石狗公的偽裝越有效；許多小魚直到太靠近才察覺。", ["bottom","reef"]),
  fish("surgeonfish", "刺尾鯛", "Surgeonfish", "common", ["reef"], ["day","dusk"], "sunny", ["shrimp"], "sprint", [20,40], [.38,1.25], 64, 1.15, "flat", ["#4e88a4","#e6b848"], "尾柄兩側藏著醒目尖棘，藍黃身影在礁岩間俐落轉彎。", "刺尾鯛是活躍的藻食者，身體扁平，能在狹窄礁縫中快速改變方向。尾部尖棘是重要特徵。", "牠的英文名 Surgeonfish，正是因為尾柄尖棘像外科醫師的手術刀。", ["sprint","reef"]),
  fish("cutlass", "白帶魚幼魚", "Juvenile Cutlassfish", "uncommon", ["deep"], ["night"], "any", ["cutfish","glow"], "sway", [35,78], [.32,1.15], 135, 1.22, "ribbon", ["#d9e4df","#8da8b5"], "銀亮長身垂直浮游，月光下像一條飄動的細緞帶。", "幼年白帶魚常在夜間靠近較淺水層，細長身形與閃亮銀色外表讓牠在暗海中特別顯眼。", "白帶魚幼魚有時會保持頭部朝上，像海裡一支緩慢擺動的銀色鉛筆。", ["night","large"]),
  fish("cuttlefish", "花枝", "Cuttlefish", "uncommon", ["reef","deep"], ["dusk","night"], "rain", ["shrimp","glow"], "rare", [16,34], [.35,1.35], 148, 1.28, "cephalopod", ["#c89076","#7c6175"], "裙鰭如波浪繞身流動，斑紋會隨心情悄悄變換。", "花枝能快速改變身體顏色與花紋，用來偽裝、溝通或驚嚇對手。黃昏後常離開藏身處覓食。", "花枝不只改變顏色，還能控制皮膚紋理，看起來像岩石或沙地。", ["night","rain"]),
  fish("squid", "小管", "Reef Squid", "uncommon", ["reef","deep"], ["night"], "any", ["shrimp","glow"], "sprint", [18,36], [.22,.88], 126, 1.2, "cephalopod", ["#e0a68d","#8d7290"], "半透明身體點亮細碎色斑，在夜海裡像一封閃爍訊息。", "小管是游動迅速的頭足類，會利用噴水推進快速後退。夜間燈光有時會吸引牠們靠近船邊。", "小管能用身上的色素細胞傳遞訊號，同伴間的對話像一場無聲燈光秀。", ["night","sprint"]),
  fish("mahi", "鬼頭刀", "Mahi-mahi", "rare", ["deep"], ["day","dusk"], "sunny", ["cutfish","glow"], "rare", [52,108], [2.2,8.4], 320, 1.55, "mahi", ["#2ab7a4","#efca56"], "金藍光澤在高速游動時流轉，是晴朗深水中的耀眼訪客。", "鬼頭刀生長迅速、游速敏捷，偏好溫暖外海。偶爾會追著魚群進入海灣深處，帶來強勁拉力。", "離水後鬼頭刀鮮豔的藍綠色會逐漸改變，因此水中的相遇格外珍貴。", ["rare","large","sprint"]),
  fish("flyingfish", "飛魚", "Flyingfish", "rare", ["deep"], ["dawn","dusk"], "any", ["cutfish","glow"], "rare", [24,45], [.38,1.25], 285, 1.48, "winged", ["#668ead","#d7e3d6"], "寬大胸鰭像一雙薄翼，受驚時會掠過晨昏海面。", "飛魚能以強力尾鰭加速躍出水面，再張開寬大胸鰭滑翔。清晨與黃昏較容易看見牠的剪影。", "飛魚不是拍翅飛行，而是借助起跳速度滑翔，有時能越過相當長的海面。", ["rare","sprint"]),
  fish("lantern", "燈籠魚", "Lanternfish", "uncommon", ["deep"], ["night"], "rain", ["glow"], "sway", [7,15], [.04,.16], 164, 1.3, "glow", ["#263f65","#77e2ca"], "腹側微光像一串沉入海中的星星，只在深夜雨幕間靠近。", "燈籠魚身上具有發光器，平時多在深水活動，夜間可能往上層移動覓食。牠的微光能協助隱蔽輪廓。", "從下方看，腹部發光可以模仿海面微光，讓掠食者不容易發現牠。", ["night","rain","small"]),
  fish("sea_eel", "海鰻", "Sea Eel", "uncommon", ["reef","deep"], ["night"], "rain", ["worm","cutfish"], "endurance", [42,92], [.7,3.2], 152, 1.34, "ribbon", ["#6b7254","#c0aa66"], "長身沿著礁岩陰影緩慢滑行，雨夜才離開熟悉的洞穴。", "海鰻白天多半藏在岩縫裡，入夜後才沿著海底尋找食物。牠的長形身體能自在穿過狹窄空間。", "海鰻游泳時會讓全身形成連續波浪，彷彿一條被海流牽動的緞帶。", ["night","rain","bottom","large"]),
  fish("ribbon", "月紗皇帶魚", "Moonveil Oarfish", "rare", ["deep"], ["night"], "rain", ["glow"], "rare", [85,168], [3.5,12.6], 520, 1.72, "ribbon", ["#c6d8e8","#d686a0"], "緋紅長鰭拖著月色般的銀白身體，是雨夜最安靜的傳說。", "月紗皇帶魚是海灣水手筆記中的幻想化稀有魚。只在細雨深夜靠近海面，長長背鰭像被潮流梳動的紅紗。", "據說看見牠的人若安靜許願，船燈會在回家的路上比平常更明亮。", ["rare","night","rain","large"]),
  fish("horse_mackerel", "竹筴魚", "Japanese Horse Mackerel", "common", ["shore","deep"], ["dusk","night"], "any", ["bread","cutfish"], "sprint", [16,34], [.12,.55], 44, .88, "torpedo", ["#9db9b2","#41677a"], "側線銀光在暮色裡連成一列，魚群總貼著潮路快速轉向。", "竹筴魚會結成整齊魚群追逐小型餌料，黃昏後也常靠近有微光的水面。尾柄附近較硬的稜鱗，讓牠的側線看起來格外俐落。", "竹筴魚側線後段的稜鱗像一排小護甲，摸起來比魚身其他部位更硬。", ["small","sprint","night"]),
  fish("threadfin_bream", "金線魚", "Golden Threadfin Bream", "common", ["reef","deep"], ["dawn","day"], "sunny", ["shrimp","worm"], "steady", [18,36], [.25,.82], 62, .92, "slender", ["#e6a45b","#f2d979"], "粉金色魚身拖著細長黃線，像晨光在沙地上留下一筆。", "金線魚喜歡在礁石外圍與沙泥底覓食，清晨陽光照進水中時最容易看見牠鮮明的黃色縱帶。", "尾鰭延伸出的細絲會隨游動輕輕擺動，是金線魚最醒目的記號。", ["bottom"]),
  fish("goatfish", "秋姑魚", "Yellowstripe Goatfish", "common", ["reef"], ["dawn","dusk"], "any", ["shrimp","worm"], "sway", [16,32], [.18,.65], 58, .93, "slender", ["#d9b269","#9b5d4d"], "一對觸鬚輕掃礁沙，黃紅色身影沿著海底耐心搜尋。", "秋姑魚會用下巴的兩根觸鬚翻找藏在沙中的小型生物。牠游得不急，卻能敏銳辨認腳下每一道氣味。", "秋姑魚的觸鬚帶有味覺感受能力，像兩支貼著海床工作的探測器。", ["bottom","reef"]),
  fish("threeline_grunt", "三線雞魚", "Threeline Grunt", "common", ["shore","reef"], ["day","dusk"], "any", ["bread","shrimp"], "steady", [14,31], [.18,.7], 52, .9, "round", ["#e7d49a","#6e7881"], "三道深色縱線穿過淡金魚身，總在礁影與淺灘之間往返。", "三線雞魚白天常聚在礁石附近，黃昏會沿著淺水帶尋找小型甲殼生物。牠穩定的拉力很適合練習收線節奏。", "雞魚受到驚擾時能藉由體內構造發出低沉聲響，這也是英文 Grunt 名稱的由來。", ["small","reef"]),
  fish("yellow_boxfish", "黃箱魨", "Yellow Boxfish", "uncommon", ["reef"], ["day"], "sunny", ["shrimp","bread"], "sway", [10,25], [.12,.78], 120, 1.12, "box", ["#edc94f","#554f42"], "亮黃色方形身體點著黑斑，像一只在礁石間漂浮的小箱子。", "黃箱魨以胸鰭細緻調整方向，游速不快卻能靈巧穿過礁縫。幼魚鮮亮的黃黑斑紋在晴朗水域中特別醒目。", "黃箱魨的身體由硬質骨板包覆，只有嘴、魚鰭與尾部能靈活活動。", ["small","reef"]),
  fish("needlefish", "針魚", "Needlefish", "uncommon", ["shore","deep"], ["dawn","dusk"], "sunny", ["bread","cutfish"], "sprint", [28,68], [.22,1.15], 118, 1.26, "needle", ["#b7d6cf","#4a7f91"], "細長身體貼著水面疾行，尖嘴把晨昏光線劃成一道銀痕。", "針魚多在接近水面的區域追逐小魚，受驚時會突然加速甚至躍離水面。牠的衝刺短促而明確，需要及時放鬆魚線。", "針魚上下顎都向前延伸，形成適合在水面追捕小魚的細長嘴部。", ["sprint","large"]),
  fish("red_seabream", "真鯛", "Red Seabream", "uncommon", ["reef","deep"], ["dawn","dusk"], "any", ["shrimp","worm"], "endurance", [30,72], [1.1,5.6], 185, 1.36, "flat", ["#d98378","#a74f57"], "淡紅鱗片映著藍色星點，沉穩身影沿礁坡緩緩巡游。", "真鯛常在礁石與較深沙地交界活動，會以強健牙齒取食甲殼與貝類。上鉤後不急著衝刺，而是持續施加厚實拉力。", "真鯛體色會隨棲息深度與光線改變，深水個體通常顯得更鮮紅。", ["bottom","large"]),
  fish("malabar_grouper", "馬拉巴石斑", "Malabar Grouper", "uncommon", ["reef","deep"], ["dusk","night"], "rain", ["shrimp","cutfish"], "endurance", [42,92], [1.8,9.6], 210, 1.46, "round", ["#6f765d","#3f4b45"], "深褐雲斑藏進雨夜礁影，只在靠近時露出厚實輪廓。", "馬拉巴石斑偏好有洞穴與遮蔽物的礁區。細雨讓海面變暗後，較大的個體會離開藏身處，在礁坡與深水交界巡游。", "石斑魚張口吸食獵物時，口腔會像瞬間張開的水泵，把附近海水一起吸入。", ["bottom","large","night","rain"]),
  fish("mirror_butterflyfish", "鏡斑蝴蝶魚", "Mirror Butterflyfish", "rare", ["reef"], ["dawn","day"], "sunny", ["shrimp"], "sway", [12,25], [.1,.42], 248, 1.34, "flat", ["#f0c847","#31383f"], "金黃身側托著一面墨色圓斑，轉身時像小鏡子掠過珊瑚。", "鏡斑蝴蝶魚常成對穿梭在結構複雜的礁區，以細小嘴部啄食礁石表面的微小食物。晴朗晨光最能映出牠鮮明的黑黃對比。", "身側的大型黑斑能打亂真正眼睛的位置，讓掠食者不容易判斷牠準備游向哪一邊。", ["rare","small","reef"]),
  fish("greater_amberjack", "紅甘", "Greater Amberjack", "rare", ["deep"], ["dawn","day"], "any", ["cutfish","glow"], "rare", [55,130], [3.2,18.5], 410, 1.68, "torpedo", ["#8da29b","#c79b4e"], "琥珀色側線穿過厚實銀身，是深水晨光裡強健而從容的旅者。", "紅甘會在深水礁坡與潮流交會處巡游，結實身形能帶來長時間的強勁拉力。牠不常靠岸，是準備充分的釣手才容易遇見的目標。", "紅甘眼部常有一道斜向深色帶，琥珀色側線則讓牠在轉身時格外醒目。", ["rare","large","sprint"])
];

export const RARITY = {
  common: { name: "常見", multiplier: 1, color: "#7fa8a0" },
  uncommon: { name: "少見", multiplier: 1.8, color: "#5c91b9" },
  rare: { name: "稀有", multiplier: 4, color: "#d19b4a" }
};

export const BAY_EVENTS = [
  {
    id: "silver_tide",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "銀潮靠岸",
    icon: "✦",
    description: "成群的銀色小魚沿著潮線靠近淺灘，海面像被晨光輕輕翻動。",
    spotIds: ["shore"],
    fishIds: ["sardine", "anchovy"],
    fishWeightMultiplier: 4,
    objective: "在近岸捕獲 3 條沙丁魚或鯷魚",
    goal: 3,
    hints: [
      "銀色水紋剛靠近淺灘，麵包糰會是舒服的起點。",
      "第一束銀光已寫進日誌，再沿著近岸找找。",
      "魚群正在船邊轉向，再一次相遇就能完成觀察。",
      "今日銀潮觀察完成。"
    ],
    firstReward: { type: "title", value: "銀潮見證者", label: "稱號「銀潮見證者」" },
    repeatReward: { type: "coins", amount: 60, label: "60 金幣" }
  },
  {
    id: "moonlit_tide",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "月光潮汐",
    icon: "☾",
    description: "月色把礁石與深水之間的潮路照亮，夜行魚群正沿著冷光緩緩上浮。",
    spotIds: ["reef", "deep"],
    timeIds: ["night"],
    fishIds: ["squid", "cutlass", "lantern"],
    fishWeightMultiplier: 3.5,
    objective: "夜晚在礁石或深水捕獲 2 條月光訪客",
    goal: 2,
    inactiveHint: "月色尚未升起。先回船屋休息到夜晚，再帶著小蝦或發光魚餌出航。",
    hints: [
      "潮路已被月光照亮；礁石可尋找小管，深水還有更多夜行身影。",
      "第一位月光訪客已留下紀錄，再沿著冷色潮光尋找一次。",
      "今日月光潮汐觀察完成。"
    ],
    firstReward: { type: "title", value: "月潮聆聽者", label: "稱號「月潮聆聽者」" },
    repeatReward: { type: "coins", amount: 80, label: "80 金幣" }
  },
  {
    id: "rain_drift",
    regionId: SLEEPING_TIDE_BAY_ID,
    name: "雨後漂流",
    icon: "☂",
    description: "細雨把海草、碎貝與浮木推向礁石邊緣，躲藏其中的魚也跟著漂流帶靠近。",
    spotIds: ["reef"],
    weatherIds: ["rain"],
    forceWeather: "rain",
    fishIds: ["black_bream", "scorpionfish", "cuttlefish", "sea_eel"],
    fishWeightMultiplier: 3.2,
    objective: "細雨時在礁石捕獲 2 條漂流帶訪客",
    goal: 2,
    inactiveHint: "雨帶還沒靠近礁石；等細雨落下，再準備小蝦或沙蠶前往礁區。",
    hints: [
      "沿著浮木與海草交界拋竿，小蝦或沙蠶容易吸引躲藏其中的魚。",
      "第一份雨潮紀錄已完成，漂流帶裡還有另一道身影。",
      "今日雨後漂流觀察完成。"
    ],
    firstReward: { type: "title", value: "雨潮守望者", label: "稱號「雨潮守望者」" },
    repeatReward: { type: "coins", amount: 90, label: "90 金幣" }
  }
];

export const MILESTONES = [
  { count: 5, name: "海灣初識", reward: "魚形掛飾", coins: 100 },
  { count: 10, name: "潮汐觀察家", reward: "星藍船燈", coins: 220 },
  { count: 15, name: "深藍收藏家", reward: "圖鑑桌布", coins: 360 },
  { count: 20, name: "近海圖鑑成冊", reward: "月紗船帆與徽章", coins: 600 },
  { count: 25, name: "遠潮新頁", reward: "深藍觀察旗", coins: 800 },
  { count: 30, name: "鰭之圖鑑完成", reward: "星潮船帆與徽章", coins: 1200 }
];

export const AQUARIUM_CAPACITY_MILESTONES = [
  { discoveries: 5, capacity: 3 },
  { discoveries: 10, capacity: 5 },
  { discoveries: 15, capacity: 8 },
  { discoveries: 20, capacity: 10 },
  { discoveries: 25, capacity: 12 },
  { discoveries: 30, capacity: 15 }
];

export const ACHIEVEMENTS = [
  { id: "first_catch", name: "海的第一封信", description: "捕獲第一條魚", type: "totalCaught", goal: 1, reward: { type: "coins", amount: 40, label: "40 金幣" } },
  { id: "species_5", name: "海灣初識", description: "發現 5 種魚", type: "species", goal: 5, reward: { type: "title", value: "海灣訪客", label: "稱號「海灣訪客」" } },
  { id: "species_10", name: "潮汐觀察家", description: "發現 10 種魚", type: "species", goal: 10, reward: { type: "coins", amount: 120, label: "120 金幣" } },
  { id: "species_20", name: "鰭之圖鑑 · 近海篇", description: "發現 20 種魚", type: "species", goal: 20, reward: { type: "title", value: "鰭之記錄者", label: "稱號「鰭之記錄者」" } },
  { id: "species_30", name: "鰭之圖鑑", description: "發現全部 30 種魚", type: "species", goal: 30, reward: { type: "title", value: "海灣博物學家", label: "稱號「海灣博物學家」" } },
  { id: "familiar_5", name: "熟悉的身影", description: "5 種魚達到熟悉", type: "familiarSpecies", goal: 5, reward: { type: "coins", amount: 120, label: "120 金幣" } },
  { id: "mastery_1", name: "一種魚，一片海", description: "任一魚種達到精通", type: "masteredSpecies", goal: 1, reward: { type: "title", value: "耐心觀察者", label: "稱號「耐心觀察者」" } },
  { id: "mastery_10", name: "海灣研究者", description: "10 種魚達到精通", type: "masteredSpecies", goal: 10, reward: { type: "coins", amount: 240, label: "240 金幣" } },
  { id: "record_3", name: "尺寸之外", description: "捕獲 3 條紀錄級魚", type: "recordCatches", goal: 3, reward: { type: "coins", amount: 100, label: "100 金幣" } },
  { id: "shimmer_1", name: "波光留下來了", description: "首次捕獲閃光個體", type: "shimmerSpecies", goal: 1, reward: { type: "aquariumDecor", value: "shimmer_specks", label: "水族箱光點標記" } },
  { id: "shimmer_5", name: "收集海上的星星", description: "捕獲 5 種不同閃光魚", type: "shimmerSpecies", goal: 5, reward: { type: "title", value: "拾光者", label: "稱號「拾光者」" } },
  { id: "aquarium_3", name: "小小海灣", description: "水族箱同時展示 3 條魚", type: "aquariumCount", goal: 3, reward: { type: "coins", amount: 80, label: "80 金幣" } },
  { id: "conditions_4", name: "從晨霧到星光", description: "四個時段都曾成功捕獲魚", type: "uniqueTimes", goal: 4, reward: { type: "coins", amount: 80, label: "80 金幣" } }
];

export const AQUARIUM_DECORATIONS = [
  { id: "shimmer_specks", name: "水族箱光點", description: "讓收藏箱浮現柔和的金色光點。" }
];

export const CONTENT_VALIDATION = validateContentCatalog({
  times: TIMES,
  spots: SPOTS,
  rods: RODS,
  baits: BAITS,
  furniture: FURNITURE,
  fish: FISH,
  rarities: RARITY,
  dailyGoals: DAILY_GOAL_TEMPLATES,
  events: BAY_EVENTS,
  achievements: ACHIEVEMENTS,
  aquariumDecorations: AQUARIUM_DECORATIONS,
  regions: REGIONS,
  routes: ROUTES,
  residents: RESIDENTS,
  commissions: COMMISSION_TEMPLATES
});
