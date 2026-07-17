export const AUTO_FISHING_EQUIPMENT = Object.freeze({
  id: "stillwater_auto_rack",
  name: "靜潮自動釣架",
  unlockShipId: "tidewhisper_residence",
  price: 1500,
  maxOfflineMs: 3 * 60 * 60 * 1000,
  catchIntervalMs: 4 * 60 * 1000,
  maxCatchCount: 45,
  familiarityLimitPerFish: 3,
  description: "船燈熄下後，釣架才會在目前港口替你守著一小段安靜的潮水。"
});

export const AUTO_FISHING_POETIC_LINES = Object.freeze({
  returned: [
    "船門再次推開時，細線上還留著港灣慢慢晃過的水光。",
    "這段時間沒有催促，只有幾尾熟悉身影替船屋守著潮聲。"
  ],
  "bait-empty": [
    "最後一份魚餌隨水紋散開，釣架便安靜收住了線。",
    "木盒已經空了，港灣替這次守候留下一道剛好的句點。"
  ],
  "three-hour-limit": [
    "三小時的潮聲已經足夠，剩下的海仍留給下一次慢慢相遇。",
    "釣架在第三個鐘點收線，船邊的浪也跟著回到安靜。"
  ],
  "returned-early": [
    "離開的時間很短，釣架只替你聽了一會兒水聲。",
    "潮水才剛碰到船緣，你便回到了這盞熟悉的燈下。"
  ],
  "clock-rollback": [
    "時間的刻度輕輕錯開，這一次便不向海索取任何成果。"
  ],
  stopped: [
    "釣架已把細線收好，沒有把任何牽掛留在舊港口。"
  ],
  empty: [
    "熟悉的魚影沒有靠近，這段空白也被海好好保存。"
  ]
});

export const AUTO_FISHING_REASON_LABELS = Object.freeze({
  returned: "回到船上，設定仍會在下次關閉時繼續",
  "returned-early": "離線時間尚短，這次沒有消耗魚餌",
  "bait-empty": "所選魚餌已用完，釣架安全停止",
  "three-hour-limit": "已達單次三小時上限，釣架安全停止",
  "clock-rollback": "裝置時間倒退，這次沒有計入成果",
  "no-eligible-fish": "目前釣點沒有符合規則的熟悉魚種",
  departed: "船已出航，原港口設定安全停止",
  "region-changed": "停泊海域已改變，原設定安全停止",
  manual: "玩家已收起釣架"
});
