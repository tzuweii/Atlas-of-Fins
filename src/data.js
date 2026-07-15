export const TIMES = [
  { id: "dawn", name: "清晨", icon: "◒", line: "晨霧正沿著海面慢慢散去" },
  { id: "day", name: "白天", icon: "☀", line: "陽光在波紋上撒下碎金" },
  { id: "dusk", name: "黃昏", icon: "◐", line: "晚霞把海灣染成溫柔的橘紅" },
  { id: "night", name: "夜晚", icon: "☾", line: "船燈與星光在深藍海面相映" }
];

export const SPOTS = [
  { id: "shore", name: "近岸淺水區", icon: "⌁", description: "魚群活躍、咬餌快速，是最舒服的起點。", hint: "常見魚比例高", difficulty: 1 },
  { id: "reef", name: "礁石邊緣", icon: "◒", description: "海草環繞著礁石，色彩鮮明的魚穿梭其中。", hint: "少見魚較多", difficulty: 2 },
  { id: "deep", name: "海灣深水區", icon: "◉", description: "深藍水域藏著大型與稀有的身影。", hint: "需強化遠投竿", difficulty: 3, requires: "farcast" }
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
  difficulty, shape, colors, short, detail, fact, tags
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
  fish("ribbon", "月紗皇帶魚", "Moonveil Oarfish", "rare", ["deep"], ["night"], "rain", ["glow"], "rare", [85,168], [3.5,12.6], 520, 1.72, "ribbon", ["#c6d8e8","#d686a0"], "緋紅長鰭拖著月色般的銀白身體，是雨夜最安靜的傳說。", "月紗皇帶魚是海灣水手筆記中的幻想化稀有魚。只在細雨深夜靠近海面，長長背鰭像被潮流梳動的紅紗。", "據說看見牠的人若安靜許願，船燈會在回家的路上比平常更明亮。", ["rare","night","rain","large"])
];

export const RARITY = {
  common: { name: "常見", multiplier: 1, color: "#7fa8a0" },
  uncommon: { name: "少見", multiplier: 1.8, color: "#5c91b9" },
  rare: { name: "稀有", multiplier: 4, color: "#d19b4a" }
};

export const QUEST_TEMPLATES = [
  { id: "common3", text: "捕獲 3 條常見魚", type: "rarity", target: "common", goal: 3, reward: 85 },
  { id: "night1", text: "捕獲 1 條夜間魚", type: "tag", target: "night", goal: 1, reward: 110 },
  { id: "shrimp1", text: "使用小蝦捕獲任意魚類", type: "bait", target: "shrimp", goal: 1, reward: 80 },
  { id: "sell100", text: "販售總值達 100 金幣", type: "sell", target: "coins", goal: 100, reward: 75 },
  { id: "large1", text: "捕獲 1 條大型魚", type: "size", target: "large", goal: 1, reward: 105 }
];

export const MILESTONES = [
  { count: 5, name: "海灣初識", reward: "魚形掛飾", coins: 100 },
  { count: 10, name: "潮汐觀察家", reward: "星藍船燈", coins: 220 },
  { count: 15, name: "深藍收藏家", reward: "圖鑑桌布", coins: 360 },
  { count: 20, name: "鰭之圖鑑完成", reward: "月紗船帆與徽章", coins: 600 }
];
