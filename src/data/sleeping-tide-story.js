import { LIGHTHOUSE_KEEPER_ID } from "./residents.js";
import { SLEEPING_TIDE_BAY_ID } from "./regions.js";
import { SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID } from "./routes.js";

const sleepingCatchTask = (title, description, spotIds, goal) => ({
  kind: "catch",
  title,
  description,
  goal,
  condition: {
    eventType: "catch",
    regionIds: [SLEEPING_TIDE_BAY_ID],
    ...(spotIds?.length ? { spotIds } : {})
  }
});

export const SLEEPING_TIDE_STORY_SCENES = [
  {
    id: "keeper_returning_light",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 1,
    title: "燈塔替你記住方向",
    locationName: "眠潮泊地 · 燈塔小徑",
    trigger: { type: "tutorial-completed" },
    opening: [
      { speaker: "旁白", text: "你第一次不靠指引收好釣具時，燈塔的光正從港口木欄上緩緩掃過。守望者站在小徑盡頭，把今日海況寫進一本厚厚的冊子。" },
      { speaker: "燈塔守望者", text: "剛才那一趟是別人陪你認路。從下一竿開始，什麼時候出發、帶哪種魚餌、何時回來，都由你自己決定。" },
      { speaker: "旁白", text: "他將冊子轉向你。頁面沒有催促完成的期限，只留著近岸水色與兩格尚未寫下的相遇。" },
      { speaker: "燈塔守望者", text: "先在近岸親手留下兩筆捕獲吧。不是考試，只是讓你確認：沒有聚光指引時，你仍知道如何從港口出發，再沿著燈回來。" }
    ],
    objective: sleepingCatchTask(
      "完成第一次獨立出航",
      "不使用教學捕獲，在近岸淺水區親手捕獲 2 條魚，再回到燈塔交付紀錄。",
      ["shore"],
      2
    ),
    completion: [
      { speaker: "旁白", text: "兩筆捕獲紀錄被放進海況冊。守望者先看落點與時段，才看魚名，像是在確認一條能安全往返的細線。" },
      { speaker: "燈塔守望者", text: "你已經能自己完成一趟出航了。航程追蹤會替你記住正在做的事，但海面不會要求你一直盯著數字。" },
      { speaker: "旁白", text: "燈塔再次掃過水面。近岸仍是原來的近岸，你卻第一次知道自己能從這裡自由出發。" },
      { speaker: "燈塔守望者", text: "下一次，我們把目光移到礁石。海域名稱相同，不代表每一種魚都住在相同的水裡。" }
    ]
  },
  {
    id: "keeper_two_habitats",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 2,
    title: "礁影有自己的住處",
    locationName: "眠潮泊地 · 燈塔海況室",
    opening: [
      { speaker: "旁白", text: "海況室牆上掛著兩張疊在一起的圖：一張畫近岸沙地，一張畫礁石與海草。相同的海灣輪廓裡，魚影落在完全不同的位置。" },
      { speaker: "燈塔守望者", text: "圖鑑裡的棲地不是裝飾。每種魚只屬於一片海域；常見與少見的魚會在區域裡移動，但仍更常回到熟悉的原生釣點。" },
      { speaker: "燈塔守望者", text: "稀有以上就不同了。牠們只會進入標示的限定棲地；魚餌、時段與天氣能提高相遇傾向，卻不能把牠們從別的釣點叫過來。" },
      { speaker: "旁白", text: "他請你翻開圖鑑的棲地註記，再指向甲板釣具台上的近岸與礁石卡片。" },
      { speaker: "燈塔守望者", text: "不用替我尋找稀有魚。只要在近岸與礁石各留下一筆普通捕獲，親自感受換一處落點，魚池就會跟著改變。" }
    ],
    objective: {
      kind: "catch-contexts",
      title: "比較近岸與礁石棲地",
      description: "先在圖鑑查看棲地說明，再於近岸與礁石各手動捕獲 1 條魚；不要求捕獲稀有魚。",
      goal: 2,
      uniqueKey: "spotId",
      requiredValues: ["shore", "reef"],
      steps: [
        { value: "shore", label: "近岸淺水區留下捕獲" },
        { value: "reef", label: "礁石邊緣留下捕獲" }
      ],
      condition: {
        eventType: "catch",
        regionIds: [SLEEPING_TIDE_BAY_ID],
        spotIds: ["shore", "reef"]
      }
    },
    completion: [
      { speaker: "旁白", text: "近岸與礁石的紀錄並排後，原本抽象的棲地標示有了水深、顏色與魚線落下的位置。" },
      { speaker: "燈塔守望者", text: "常見魚可能離開最熟悉的角落，但稀有以上的魚不會跨過限定棲地。找不到牠時，先確認釣點，再考慮時段、天氣與魚餌。" },
      { speaker: "旁白", text: "他在兩張圖之間留下一段空白，沒有畫出任何尚未遇見的魚，只寫下『住處先於名字』。" },
      { speaker: "燈塔守望者", text: "你不需要現在就追逐那些剪影。知道牠們有自己的住處，已經是尊重海灣的第一步。" }
    ]
  },
  {
    id: "keeper_catch_destinations",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 3,
    title: "今天的魚要去哪裡",
    locationName: "眠潮泊地 · 魚市場棚屋",
    opening: [
      { speaker: "旁白", text: "魚市場老闆替漁獲箱挪出一塊乾淨桌面，燈塔守望者則把海況冊放在旁邊。相同的一尾魚，在桌上有了兩種不同去處。" },
      { speaker: "魚市場老闆", text: "帶回來的漁獲可以販售，港口會把牠變成今天的補給；喜歡的標本也能放進船屋水族箱，之後隨時可以免費取回。" },
      { speaker: "燈塔守望者", text: "圖鑑記住的是相遇，不是你手上還留著什麼。即使售出漁獲，魚名、尺寸與環境紀錄都不會消失。" },
      { speaker: "旁白", text: "水族箱需要先認識五種魚才會開放。這不是限制收藏，而是等你真的有幾段相遇值得並排保存。" },
      { speaker: "燈塔守望者", text: "這次由你決定去處：販售兩份漁獲，再替船屋留下第一份水族箱標本。" }
    ],
    objective: {
      kind: "checklist",
      title: "理解漁獲、圖鑑與水族箱",
      description: "累積發現 5 種魚以開放水族箱；販售 2 份漁獲，並將 1 份漁獲放入水族箱。",
      goal: 2,
      parts: [
        {
          id: "sell_two_catches",
          label: "販售 2 份漁獲",
          goal: 2,
          condition: { eventType: "sell", metric: "count" }
        },
        {
          id: "display_one_catch",
          label: "在水族箱展示 1 份漁獲",
          goal: 1,
          condition: { eventType: "aquarium", metric: "count" }
        }
      ]
    },
    completion: [
      { speaker: "旁白", text: "市場收下兩份漁獲，船屋也亮起第一座小型觀察箱。圖鑑裡的紀錄沒有因任何選擇而少掉一頁。" },
      { speaker: "魚市場老闆", text: "很好。需要補給時就販售，想多看幾眼時就留下。沒有哪一種去處比較像真正的收藏。" },
      { speaker: "燈塔守望者", text: "你已經會整理一次出航的結果了。金幣用來添購裝備，圖鑑保存知識，水族箱保存你想帶回船屋的相遇。" },
      { speaker: "旁白", text: "三種用途各自留在正確的位置，沒有任何一個數字要求你把每尾魚做成相同選擇。" }
    ]
  },
  {
    id: "keeper_four_lights",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 4,
    title: "一天裡的四種光",
    locationName: "眠潮泊地 · 燈塔平台",
    opening: [
      { speaker: "旁白", text: "守望者把四片不同顏色的玻璃排在燈前：清晨的灰藍、白日的明亮、黃昏的暖橙，以及夜晚近乎透明的深色。" },
      { speaker: "燈塔守望者", text: "魚不會因為你打開圖鑑才改變作息。牠們原本就在不同時段覓食、休息或沿潮線移動，圖鑑只是把已知線索整理給你。" },
      { speaker: "旁白", text: "船屋的休息區可以讓航海時段向前推進。沒有體力條，也沒有必須睡眠的倒數；換時段只是你選擇觀察另一種海。" },
      { speaker: "燈塔守望者", text: "請在兩個不同時段各留下一筆手動捕獲。魚種不必相同，也不用等待特定的一天，只要親眼看見光線改變魚群的排列。" }
    ],
    objective: {
      kind: "catch-contexts",
      title: "在兩種時段留下紀錄",
      description: "使用船屋休息換時段，於任意兩個不同時段各手動捕獲魚類。",
      goal: 2,
      uniqueKey: "timeId",
      condition: {
        eventType: "catch",
        regionIds: [SLEEPING_TIDE_BAY_ID]
      }
    },
    completion: [
      { speaker: "旁白", text: "兩筆不同光線下的捕獲被夾進海況冊。即使魚名相同，牠靠近的方向與海面顏色也留下不同註記。" },
      { speaker: "燈塔守望者", text: "清晨、白日、黃昏與夜晚不是四張背景，而是四種正在發生的生活。想找某道魚影時，先看看牠偏好的光。" },
      { speaker: "旁白", text: "四片玻璃被收回木盒，船屋休息區與圖鑑的時段欄位從此成為可以自己安排的航海工具。" },
      { speaker: "燈塔守望者", text: "接下來還有一層會改變水色：天氣。它不決定你能不能出海，只會讓某些相遇更容易靠近。" }
    ]
  },
  {
    id: "keeper_weather_surface",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 5,
    title: "天氣寫在海面上",
    locationName: "眠潮泊地 · 測候欄",
    opening: [
      { speaker: "旁白", text: "測候欄上同時掛著晴朗與細雨的舊記錄。守望者沒有預測哪一張會成真，只把目前海面的顏色圈了起來。" },
      { speaker: "燈塔守望者", text: "天氣偏好是加成，不是封鎖。多數魚在不偏好的天氣仍可能出現；只有圖鑑明確寫下晴朗或細雨時，那種水色才會讓牠更常靠近。" },
      { speaker: "旁白", text: "今日特殊海況也會出現在航程追蹤，但它只是選填的每日目標，不是主線，不完成也不會擋住任何章節。" },
      { speaker: "燈塔守望者", text: "看看目前是晴是雨，從圖鑑找一種偏好相同天氣的魚，親手留下一筆紀錄。不要等待海域事件，也不用追逐稀有魚。" }
    ],
    objective: {
      kind: "preferred-weather-catch",
      title: "依目前天氣安排一次出航",
      description: "在眠潮灣手動捕獲 1 條偏好目前晴朗或細雨天氣的魚；海域事件不列為條件。",
      goal: 1,
      regionId: SLEEPING_TIDE_BAY_ID
    },
    completion: [
      { speaker: "旁白", text: "捕獲時的天氣與魚種偏好彼此吻合，測候欄上多了一筆不是預言、而是親手確認的紀錄。" },
      { speaker: "燈塔守望者", text: "你已經會讀釣點、時段與天氣了。魚餌能再推近一點機會，但真正決定去哪裡、何時停下的仍是你。" },
      { speaker: "旁白", text: "旁邊的特殊海況卡仍安靜掛著。它可以完成，也可以留給下一次潮聲，沒有和主線冊上的任何一格相連。" },
      { speaker: "燈塔守望者", text: "剩下的不是新介面，而是把這些方法用在整片眠潮灣。等你認得大多數住民，我有一張灣外海圖要交給你。" }
    ]
  },
  {
    id: "keeper_outer_current_chart",
    residentId: LIGHTHOUSE_KEEPER_ID,
    chapter: 6,
    title: "灣外的暖流線",
    locationName: "眠潮泊地 · 燈塔頂層",
    opening: [
      { speaker: "旁白", text: "燈塔頂層的圓桌上攤著一張沒有東側邊界的舊海圖。眠潮灣畫得很仔細，灣外卻只留下褪色水痕與一條尚未描深的暖流。" },
      { speaker: "燈塔守望者", text: "一片海不必百分之百收盡才算看懂。留下稀有相遇與完整收藏給往後的回訪；先認識七成住民，就足以辨認這裡主要的棲地與潮路。" },
      { speaker: "旁白", text: "眠潮灣共有三十種魚。研究冊會在第二十一種被確認時完成主路，深水、夜色與不同天氣都會成為不可缺少的線索。" },
      { speaker: "燈塔守望者", text: "完成眠潮灣二十一種魚的主研究後回來吧。我會依你的紀錄補完灣外暖流，讓海圖不只指出怎麼離開，也記得怎麼回來。" }
    ],
    objective: {
      kind: "region-main-research",
      title: "完成眠潮灣七成魚類探索",
      description: "親手發現眠潮灣 30 種魚中的 21 種，完成區域研究主路後回到燈塔。",
      goal: 21,
      regionId: SLEEPING_TIDE_BAY_ID,
      requirements: [
        {
          id: "chapter_one_lessons",
          kind: "completed-scenes",
          label: "完成前五節玩法主線",
          goal: 5,
          sceneIds: [
            "keeper_returning_light",
            "keeper_two_habitats",
            "keeper_catch_destinations",
            "keeper_four_lights",
            "keeper_weather_surface"
          ]
        },
        {
          // Keep the original content ID so existing saves and references remain valid.
          id: "sleeping_tide_species_eighty_percent",
          kind: "region-species",
          label: "眠潮灣魚類探索（21／30＝70%）",
          goal: 21,
          total: 30,
          regionId: SLEEPING_TIDE_BAY_ID
        }
      ]
    },
    reward: {
      id: "sleeping_tide_outer_chart",
      type: "route-chart",
      label: "《眠潮灣外海圖》",
      routeId: SLEEPING_TIDE_TO_LUMINOUS_ROUTE_ID
    },
    completion: [
      { speaker: "旁白", text: "第二十一種魚的棲地被放回正確位置後，近岸、礁石與深水的紀錄終於在圖上接成完整潮路。守望者沿著它們共同指向的方向描出灣外暖流。" },
      { speaker: "燈塔守望者", text: "七成已經足夠。剩下的魚不會消失，你也隨時能回來繼續尋找。主研究的意義，是讓前進不必以清空一片海為代價。" },
      { speaker: "旁白", text: "他將海圖捲起，以燈塔換下的舊繫繩綁好，正式交到你手中。船屋航圖桌隨之亮起一條通往琉光群島的暖色航線。" },
      { speaker: "燈塔守望者", text: "這不是催你離港的命令。只是等你想看看灣外的水色時，已經有一條回得來的路。" },
      { speaker: "旁白", text: "《眠潮灣外海圖》成為第一章的旅程紀念。何時展開它、何時沿暖流出航，仍由你自己決定。" }
    ]
  }
];
