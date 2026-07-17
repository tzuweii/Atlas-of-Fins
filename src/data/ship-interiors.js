export const SHIP_SLOT_TYPES = Object.freeze([
  { id: "sleep", name: "寢具", description: "固定床台上的織品與床墊。" },
  { id: "wall", name: "牆面", description: "掛在艙壁、陪伴航程的收藏。" },
  { id: "table", name: "桌面", description: "航圖桌旁可以更換的小物。" },
  { id: "light", name: "照明", description: "不影響玩法的室內燈具。" },
  { id: "corner", name: "角落", description: "替船屋留下一點生活氣息。" }
]);

export const SHIP_LIGHTING = Object.freeze([
  { id: "default", name: "隨潮日光" },
  { id: "warm", name: "暖燈相伴" },
  { id: "dim", name: "靜夜微光" }
]);

const fixedStructures = Object.freeze([
  { id: "sleep_platform", name: "固定床台", purpose: "所有船都能休息，不依賴可替換寢具。" },
  { id: "chart_table", name: "固定航圖桌", purpose: "古海圖與航程操作入口。" },
  { id: "journal_shelf", name: "固定日誌架", purpose: "航海日誌與魚類圖鑑入口。" },
  { id: "aquarium_plinth", name: "固定水族箱基座", purpose: "全局標本在不同船上的展示外框。" }
]);

export const SHIP_INTERIOR_SCENES = Object.freeze([
  {
    id: "drifting_home_interior",
    shipId: "drifting_home",
    theme: "patched-timber",
    aquariumFrameId: "weathered-brass",
    palette: ["#d0a675", "#654d3c", "#f2c56d"],
    fixedStructures,
    slots: {
      sleep: { x: 7, y: 65, width: 35, height: 20 },
      wall: { x: 8, y: 22, width: 23, height: 20 },
      table: { x: 68, y: 60, width: 25, height: 22 },
      light: { x: 78, y: 24, width: 13, height: 20 },
      corner: { x: 46, y: 68, width: 13, height: 20 }
    }
  },
  {
    id: "tidewhisper_residence_interior",
    shipId: "tidewhisper_residence",
    theme: "round-window-nest",
    aquariumFrameId: "seafoam-ceramic",
    palette: ["#d8c49d", "#54756f", "#f1bf78"],
    fixedStructures,
    slots: {
      sleep: { x: 6, y: 62, width: 38, height: 23 },
      wall: { x: 9, y: 19, width: 25, height: 21 },
      table: { x: 63, y: 61, width: 29, height: 22 },
      light: { x: 80, y: 20, width: 12, height: 21 },
      corner: { x: 47, y: 66, width: 13, height: 21 }
    }
  },
  {
    id: "voyager_study_interior",
    shipId: "voyager_study",
    theme: "tall-chart-study",
    aquariumFrameId: "midnight-brass",
    palette: ["#9a7656", "#263f48", "#e4b766"],
    fixedStructures,
    slots: {
      sleep: { x: 59, y: 62, width: 34, height: 22 },
      wall: { x: 67, y: 19, width: 24, height: 22 },
      table: { x: 8, y: 59, width: 29, height: 24 },
      light: { x: 10, y: 19, width: 13, height: 21 },
      corner: { x: 42, y: 66, width: 13, height: 21 }
    }
  }
]);

const starterFurniture = [
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
].map(item => ({ ...item, shipId: "drifting_home", priceTier: 1 }));

const tidewhisperFurniture = [
  { id: "tidewhisper_woven_quilt", baseItemId: "blanket", name: "潮紋織毯", icon: "▥", price: 180, slot: "sleep", description: "柔軟的潮紋沿著床緣起伏，像一段不會驚醒人的浪。" },
  { id: "tidewhisper_round_window_bed", baseItemId: "bed", name: "圓窗軟床", icon: "▰", price: 550, slot: "sleep", unlockDiscoveries: 6, description: "低矮床墊靠著圓窗，晨光來時剛好落在枕邊。" },
  { id: "tidewhisper_shell_lantern", baseItemId: "lantern", name: "貝殼壁燈", icon: "♢", price: 150, slot: "light", description: "乳白燈罩把雨夜照成溫柔的蜂蜜色。" },
  { id: "tidewhisper_driftwood_shelf", baseItemId: "bookshelf", name: "流木小架", icon: "▥", price: 370, slot: "wall", unlockDiscoveries: 5, description: "被海磨圓的木架，收著茶罐與薄薄幾冊故事。" },
  { id: "tidewhisper_harbor_postcards", baseItemId: "photos", name: "港灣明信片", icon: "▦", price: 280, slot: "wall", description: "每一張都留著曾經靠岸時，窗邊最安靜的顏色。" },
  { id: "tidewhisper_ceramic_tea", baseItemId: "tea", name: "海藍陶茶具", icon: "♨", price: 220, slot: "table", description: "杯緣有一圈淡藍釉色，盛得住慢慢冷下來的午後。" },
  { id: "tidewhisper_fern_basket", baseItemId: "plant", name: "海蕨編籃", icon: "♧", price: 240, slot: "corner", description: "小葉片在編籃裡輕晃，替寬船艙添一點綠。" },
  { id: "tidewhisper_music_box", baseItemId: "radio", name: "潮聲音樂匣", icon: "▣", price: 670, slot: "table", unlockDiscoveries: 12, description: "轉動黃銅發條，細小旋律便和船外浪聲疊在一起。" }
].map(item => ({ ...item, shipId: "tidewhisper_residence", priceTier: 1.15 }));

const voyagerFurniture = [
  { id: "voyager_chartmaker_quilt", baseItemId: "blanket", name: "測繪師絨毯", icon: "▥", price: 210, slot: "sleep", description: "深藍絨面織著細小經緯線，像把一角航圖蓋在身上。" },
  { id: "voyager_brass_berth", baseItemId: "bed", name: "黃銅書艙床", icon: "▰", price: 620, slot: "sleep", unlockDiscoveries: 6, description: "窄床沿著書牆收好，黃銅邊角在夜裡留下微光。" },
  { id: "voyager_reading_lamp", baseItemId: "lantern", name: "星圖閱讀燈", icon: "♢", price: 170, slot: "light", description: "光只落在翻開的頁面，讓艙內其他角落保持安靜。" },
  { id: "voyager_atlas_shelf", baseItemId: "bookshelf", name: "遠海圖冊架", icon: "▥", price: 420, slot: "wall", unlockDiscoveries: 5, description: "高而穩的圖冊架，紙頁之間夾著曬乾的海草。" },
  { id: "voyager_specimen_frames", baseItemId: "photos", name: "生態素描框", icon: "▦", price: 310, slot: "wall", description: "鉛筆線條記下魚鰭與礁影，不急著替未知填上名字。" },
  { id: "voyager_compass_tea", baseItemId: "tea", name: "羅盤茶盤", icon: "♨", price: 250, slot: "table", description: "圓茶盤刻著方位，熱氣升起時會暫時遮住北方。" },
  { id: "voyager_fernarium", baseItemId: "plant", name: "舷窗蕨草箱", icon: "♧", price: 270, slot: "corner", description: "耐風的蕨草住在玻璃箱裡，陪書頁一起呼吸。" },
  { id: "voyager_wave_radio", baseItemId: "radio", name: "遠潮收報機", icon: "▣", price: 750, slot: "table", unlockDiscoveries: 12, description: "旋鈕偶爾接住遙遠港口的音樂，也接住一小段雜訊。" }
].map(item => ({ ...item, shipId: "voyager_study", priceTier: 1.3 }));

export const SHIP_FURNITURE = Object.freeze([
  ...starterFurniture,
  ...tidewhisperFurniture,
  ...voyagerFurniture
].map(Object.freeze));

// 舊模組仍透過 FURNITURE 使用漂流小屋商品；Slice C 的正式入口是 SHIP_FURNITURE。
export const FURNITURE = Object.freeze(SHIP_FURNITURE.filter(item => item.shipId === "drifting_home"));

export function shipInteriorSceneByShipId(shipId) {
  return SHIP_INTERIOR_SCENES.find(scene => scene.shipId === shipId) || null;
}

export function getShipFurniture(shipId) {
  return SHIP_FURNITURE.filter(item => item.shipId === shipId);
}

export function shipFurnitureById(furnitureId) {
  return SHIP_FURNITURE.find(item => item.id === furnitureId) || null;
}
