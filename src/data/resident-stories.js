import { CHENGYE_ID } from "./residents.js";
import { LUMINOUS_ARCHIPELAGO_ID } from "./regions.js";
import {
  CLARKS_ANEMONEFISH_OBSERVATION_ID, TWO_SPINED_ANGELFISH_OBSERVATION_ID
} from "./observations.js";

const catchTask = (title, description, spotId, goal) => ({
  kind: "catch",
  title,
  description,
  goal,
  condition: {
    eventType: "catch",
    regionIds: [LUMINOUS_ARCHIPELAGO_ID],
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

export const RESIDENT_STORY_SCENES = [
  {
    id: "chengye_drifting_observer",
    residentId: CHENGYE_ID,
    chapter: 1,
    title: "繞了半片海的觀測器",
    locationName: "風棲港 · 曬網棚旁",
    trigger: { type: "visited-region", regionId: LUMINOUS_ARCHIPELAGO_ID },
    opening: [
      { speaker: "旁白", text: "風棲港的木棧橋還留著潮水退去的濕痕。曬網棚旁散著一圈細小螺帽，一枚覆滿鹽霜的黃色浮標正被拆得只剩骨架。" },
      { speaker: "澄野", text: "先別踩到那顆螺帽——對，就是你腳邊那顆。好，安全了。它比觀測器本身還難找，我可不想再繞半座港。" },
      { speaker: "旁白", text: "她把寬大的圓盤帽推到腦後，從浮標腹中抽出一卷被海水泡皺的紙帶。紙上沒有藏寶記號，只有水溫、鹽度，以及斷斷續續的藍色線條。" },
      { speaker: "澄野", text: "這東西從群島南邊漂走，繞了半片海又回來。別看它破破爛爛，沿途的水都留在這卷紙上了。我叫澄野，替這裡記魚，也記那些不適合被帶走的相遇。" },
      { speaker: "澄野", text: "你的船若會停一陣子，先替我去風棲淺灘走一趟吧。別特地追稀有的魚，只要親手帶回兩筆最尋常的捕獲，我想知道今天的淺水是否還照原來的節奏呼吸。" }
    ],
    objective: catchTask(
      "替漂流觀測器補上淺灘資料",
      "前往風棲淺灘，親手捕獲 2 條魚。自動釣魚不會代替這段行動。",
      "windrest_shallows",
      2
    ),
    completion: [
      { speaker: "旁白", text: "你把兩筆捕獲記錄攤在觀測桌上。澄野沒有先看魚的大小，而是逐一對照捕獲時的水色、風向與魚線落下的位置。" },
      { speaker: "澄野", text: "一筆在沙地邊，一筆靠近淡色海草。很好，浮標寫下來的溫度沒有騙人，淺灘今天確實比外海慢半拍。" },
      { speaker: "旁白", text: "她在泡皺的紙帶旁畫了兩個小圓點，又把浮標外殼重新扣緊。原本互不相干的捕獲，第一次在同一張圖上變成潮水的句子。" },
      { speaker: "澄野", text: "研究不一定從答案開始。有時只是有人願意把『我在這裡看見了』寫得夠準。觀測器留下海的路，你留下牠們在路上生活的證明。" }
    ]
  },
  {
    id: "chengye_lagoon_margin",
    residentId: CHENGYE_ID,
    chapter: 2,
    title: "潟湖邊緣的三種藍",
    locationName: "風棲港 · 觀測桌",
    opening: [
      { speaker: "旁白", text: "幾天後，修好的浮標被掛在觀測棚梁下。澄野把淺灘記錄分成三疊：沙底的灰藍、海草上的青藍，以及魚群轉身時一閃而過的銀藍。" },
      { speaker: "澄野", text: "港裡的人總說群島就是藍的，可只寫一個『藍』，很多事情就會從紙上消失。魚待在哪種藍裡，往往比牠叫什麼名字更早告訴我們海況。" },
      { speaker: "旁白", text: "她攤開一張尚未上色的珊瑚庭草圖。圖中央只畫了幾條礁脊，明面空著，背光處也空著，像一段故意沒有寫完的話。" },
      { speaker: "澄野", text: "稜光珊瑚庭的水會把顏色切成很多層。請你親手在那裡留下兩筆捕獲，記得看看魚從亮處來，還是從礁影裡出來。" },
      { speaker: "澄野", text: "不用替我挑漂亮的紀錄。普通的一次拋竿、普通的一條魚，只要位置確實，就足以把這張空白圖補成今天的群島。" }
    ],
    objective: catchTask(
      "辨認珊瑚庭的明暗邊界",
      "前往稜光珊瑚庭，親手捕獲 2 條魚，替棲地草圖留下現場記錄。",
      "prism_coral_garden",
      2
    ),
    completion: [
      { speaker: "旁白", text: "兩筆新記錄落到草圖上，一筆貼著珊瑚明面，一筆沿著礁脊背光處。澄野蘸了水，讓顏料自己在紙纖維間慢慢相遇。" },
      { speaker: "澄野", text: "你看，這不是兩個釣點，而是一條邊界。小魚利用陰影藏身，較大的魚沿著亮處巡游；同一座珊瑚庭，對牠們來說是完全不同的房間。" },
      { speaker: "旁白", text: "顏色乾去後，草圖上出現三種彼此交疊的藍。你開始明白，所謂棲地不是海圖上的名稱，而是光、深度與生命共同留下的形狀。" },
      { speaker: "澄野", text: "下次說『我在群島看見一條魚』時，也許可以再多說一句：牠在怎樣的水裡生活。多出的那一句，常常就是理解的開始。" }
    ]
  },
  {
    id: "chengye_anemone_home",
    residentId: CHENGYE_ID,
    chapter: 3,
    title: "不帶走的第一頁",
    locationName: "星落觀察岬",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "清晨的星落觀察岬沒有碼頭，只有一條被浪聲磨得很窄的石路。澄野早已坐在礁盤後方，相機蓋仍扣著，像是刻意不讓任何動作驚動水下。" },
      { speaker: "澄野", text: "這裡住著一群克氏雙鋸魚。牠們不稀奇到需要被追逐，卻很容易因為我們靠得太近，只剩下一張空海葵的照片。" },
      { speaker: "旁白", text: "浪花越過礁緣時，海葵觸手在淺水裡一明一滅。偶爾有橙黃的小影探出，又立刻縮回柔軟的觸手之間。" },
      { speaker: "澄野", text: "今天的任務很簡單，也可能什麼都得不到：在岬角完成一次正式觀察。不要拋竿，不要追牠，只把時段、海況和等待寫下來。" },
      { speaker: "澄野", text: "如果牠願意出來，我們就記住牠仍住在這裡；如果牠不出來，我們就記住今天沒有打擾。這兩種結果都是真實的一頁。" }
    ],
    objective: observationTask(
      "在原棲地看見克氏雙鋸魚",
      "前往星落觀察岬完成正式觀察，將克氏雙鋸魚留在海葵家中並寫入觀察簿。",
      CLARKS_ANEMONEFISH_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "等待拉長到足以聽清每一道浪的間隔後，一尾克氏雙鋸魚終於從海葵間游出。牠繞著礁面短短巡了一圈，又回到原來的位置。" },
      { speaker: "澄野", text: "看見牠回家了嗎？這就是最後一筆。不是長度，不是重量，而是牠出現之後仍能回到海葵裡。" },
      { speaker: "旁白", text: "澄野把相機裡的影像抄成文字：時間、光線、距離、行為。頁面上沒有漁獲欄，卻比任何一張捕獲記錄都更清楚地保存了相遇。" },
      { speaker: "澄野", text: "有些收藏不需要拿在手上。知道牠仍在原來的地方生活，這一頁反而更完整。從今天起，你的圖鑑也可以替海裡留下位置。" }
    ]
  },
  {
    id: "chengye_current_edge",
    residentId: CHENGYE_ID,
    chapter: 4,
    title: "黑潮頁角",
    locationName: "風棲港 · 防波堤",
    opening: [
      { speaker: "旁白", text: "午後的防波堤外有一道顏色更深的水帶，從群島南側斜斜擦過。它看來像雲影，卻在雲移開後仍停在相同方向。" },
      { speaker: "澄野", text: "那不是陰影，是暖流的邊。它把很遠的海帶到群島，也把這裡的魚、鹽分和季節往別處送。浮標繞的那半片海，大半都沿著它走。" },
      { speaker: "旁白", text: "她翻出最初那卷泡皺的紙帶，將你畫下的潟湖與珊瑚庭接到更寬廣的洋流圖上。原本完整的群島，忽然只成了地圖邊緣的一小角。" },
      { speaker: "澄野", text: "去暖流藍渠親手留下兩筆捕獲吧。那裡水深、流快，和潟湖完全不同。我要確認深色水帶裡的魚，是順流而來，還是貼著礁岸避開它。" },
      { speaker: "澄野", text: "這次別只看魚。收線時也看看水往哪裡拉你。當身體先感覺到洋流，海圖上的線就不再只是墨水。" }
    ],
    objective: catchTask(
      "親手測量暖流藍渠",
      "前往暖流藍渠，親手捕獲 2 條魚，感受深水流向並補上洋流圖。",
      "warm_current_channel",
      2
    ),
    completion: [
      { speaker: "旁白", text: "藍渠的兩筆記錄都帶著同樣的偏移：魚線入水後被推向北側，魚則沿礁緣逆著水帶停留。澄野用尺畫線，最後卻沒有把線封死。" },
      { speaker: "澄野", text: "魚沒有單純跟著流走。牠們會找背流面、會利用礁石，也會在水溫改變時換一條路。海圖若只畫箭頭，就會把牠們的選擇抹掉。" },
      { speaker: "旁白", text: "她在箭頭旁補上細小的魚影，又把圖的北端留成大片空白。那片空白不再像缺漏，更像尚待出航才能回答的邀請。" },
      { speaker: "澄野", text: "我以前總想把每條線畫準。後來才懂，可靠的圖也該承認自己還不知道什麼。留一點空白，下一次相遇才有地方落下。" }
    ]
  },
  {
    id: "chengye_twospined_light",
    residentId: CHENGYE_ID,
    chapter: 5,
    title: "礁影沒有關上門",
    locationName: "星落觀察岬",
    jointObservation: true,
    opening: [
      { speaker: "旁白", text: "黃昏前，澄野再次帶你走上星落觀察岬。這次她沒有坐在熟悉的海葵前，而是將觀察框移向更深的礁縫，耐心等光從水面退下。" },
      { speaker: "澄野", text: "有人在這裡看過一抹紫橙色，像晚霞掉進礁影。兩棘刺尻魚很少離開遮蔽處，所以我們有的只有零碎描述，沒有一頁能彼此核對的完整紀錄。" },
      { speaker: "旁白", text: "她把幾張舊紙條排在岩面：不同日期、不同光線、相近的礁縫。每張都像一句說到一半的話，沒有一張足以證明海裡一定會出現什麼。" },
      { speaker: "澄野", text: "請你完成牠的正式觀察。可能要換時段，也可能得空手回去幾次；我們不使用魚餌引牠出來，也不把礁石翻開。" },
      { speaker: "澄野", text: "真正要練習的不是等待稀有，而是在還沒看見時，仍願意尊重牠選擇不出現。等到那扇門自己打開，紀錄才屬於今天的海。" }
    ],
    objective: observationTask(
      "等礁影自己打開",
      "在星落觀察岬完成正式觀察，等待兩棘刺尻魚自然現身並寫入觀察簿。",
      TWO_SPINED_ANGELFISH_OBSERVATION_ID
    ),
    completion: [
      { speaker: "旁白", text: "夕光變薄時，礁縫裡終於浮出一片紫橙色。兩棘刺尻魚停在明暗交界片刻，沒有被追趕，也沒有被浪聲之外的動靜驚回深處。" },
      { speaker: "澄野", text: "就是那片顏色。牠不是被我們找到，只是剛好願意從礁影裡出來。先別動，讓牠自己決定這次相遇有多長。" },
      { speaker: "旁白", text: "你記下的不只有物種，也有長久的空白、光線轉暗的速度，以及牠重新隱入礁縫的時刻。等待第一次成為記錄中不可刪去的內容。" },
      { speaker: "澄野", text: "把時間也寫進去吧。不是『終於捕獲』，而是『今天，我們一起等到了』。這兩句話看似相近，留給海的空間卻完全不同。" }
    ]
  },
  {
    id: "chengye_current_map",
    residentId: CHENGYE_ID,
    chapter: 6,
    title: "留在海裡的收藏",
    locationName: "風棲港 · 黃昏碼頭",
    opening: [
      { speaker: "旁白", text: "觀測棚的長桌被六疊資料占滿：淺灘、珊瑚庭、觀察岬、暖流藍渠，以及兩疊沒有帶回任何生命、卻寫得最密的正式觀察頁。" },
      { speaker: "澄野", text: "我們已經知道群島不只有一種藍，也知道魚不必離開海，仍能成為完整收藏。可是要把這張圖交給下一片海，還差一件事。" },
      { speaker: "旁白", text: "她指向研究冊中尚未收束的空格。每個空格都對應一種在地魚與一段棲地關係；只有把十二種群島魚的資料放在一起，洋流邊緣才會顯出可相信的輪廓。" },
      { speaker: "澄野", text: "完成琉光群島的主研究吧。不是要你抓盡所有東西，而是確認十二種在地魚的生活位置，讓我們知道這張圖沒有只偏愛醒目的相遇。" },
      { speaker: "澄野", text: "等研究冊亮起最後一格，再回來找我。我會把浮標的路、你的捕獲與那兩次等待疊在一起，畫出真正能帶你往前走的線。" }
    ],
    objective: {
      kind: "region-main-research",
      title: "完成琉光群島主研究",
      description: "親手發現 12 種琉光群島魚類，完成區域研究主路後回到澄野身邊。",
      goal: 1,
      regionId: LUMINOUS_ARCHIPELAGO_ID
    },
    reward: {
      id: "chengye_handdrawn_current_map",
      type: "resident-keepsake",
      label: "澄野的手繪黑潮生態圖"
    },
    completion: [
      { speaker: "旁白", text: "最後一筆資料被放回研究冊時，十二種魚不再是分散的收藏。牠們沿著淺灘、礁影與深水重新排列，勾出一條穿過群島又向北延伸的暖流。" },
      { speaker: "澄野", text: "十二種魚、兩次安靜的等待，還有一枚繞了半片海的舊浮標。這樣就足夠叫作完整研究了——不是因為我們拿走得多，而是因為彼此的關係沒有被漏掉。" },
      { speaker: "旁白", text: "她將手繪圖捲起，用浮標拆下的藍繩繫好。圖上每條已知線都有日期與證據，北端卻仍留著一段淡色筆觸，消失在像霧一樣的紙白裡。" },
      { speaker: "澄野", text: "這張圖給你。暖流再往前會擦過一片冷霧，水色會突然變薄，魚群也會換一種排列方式。那不是謎題，只是下一片海正在發生的事。" },
      { speaker: "澄野", text: "哪天想出發，就沿著我沒畫完的那條線走吧。記得替空白保留位置——你已經知道，看見一片海不必急著把它帶走。" }
    ]
  }
];

export function getResidentStoryScenes(residentId) {
  return RESIDENT_STORY_SCENES.filter(scene => scene.residentId === residentId);
}

export function residentStorySceneById(sceneId) {
  return RESIDENT_STORY_SCENES.find(scene => scene.id === sceneId);
}
