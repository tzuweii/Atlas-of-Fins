export const SHIPS = Object.freeze([
  {
    id: "drifting_home",
    name: "漂流小屋",
    status: "implemented",
    tideglowRequired: 0,
    price: 0,
    speedMultiplier: 1,
    silhouette: "compact-sloop",
    description: "緊湊的單桅小船，舊木與補丁布簾替第一段航程留著燈。"
  },
  {
    id: "tidewhisper_residence",
    name: "潮聲居所",
    status: "implemented",
    tideglowRequired: 20,
    price: 1800,
    speedMultiplier: 1.06,
    silhouette: "wide-houseboat",
    description: "寬船身與圓窗收進更多生活氣息，航行也比從前從容一些。"
  },
  {
    id: "voyager_study",
    name: "遠航書房",
    status: "implemented",
    tideglowRequired: 50,
    price: 4200,
    speedMultiplier: 1.12,
    silhouette: "twin-mast-study",
    description: "修長雙桅托著高窗書艙，黃銅微光陪著更遠的往返。"
  },
  {
    id: "glimmer_water_room",
    name: "微光水室",
    status: "preview",
    tideglowRequired: 90,
    price: null,
    speedMultiplier: 1.18,
    silhouette: "glass-water-room",
    description: "一艘仍在未來水色裡的船，預計於後續海域開放。"
  },
  {
    id: "world_houseboat",
    name: "世界船屋",
    status: "preview",
    tideglowRequired: 140,
    price: null,
    speedMultiplier: 1.24,
    silhouette: "grand-houseboat",
    description: "像一座會移動的港灣，等待第一張航圖走得更遠。"
  },
  {
    id: "star_tide_museum",
    name: "星潮博物艙",
    status: "preview",
    tideglowRequired: 200,
    price: null,
    speedMultiplier: 1.3,
    silhouette: "museum-vessel",
    description: "把世界相遇收進星潮般的艙室；目前只留下安靜輪廓。"
  }
]);

export const IMPLEMENTED_SHIP_IDS = Object.freeze(SHIPS.filter(ship => ship.status === "implemented").map(ship => ship.id));

export function shipById(shipId) {
  return SHIPS.find(ship => ship.id === shipId) || null;
}
