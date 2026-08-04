export const FISH_RARITY_ORDER = Object.freeze([
  "common", "uncommon", "rare", "epic", "legendary", "mythic", "miracle"
]);

export const HIGH_TIER_RARITIES = Object.freeze(FISH_RARITY_ORDER.slice(2));

export const BASE_APPEARANCE_BUDGETS = Object.freeze({
  common: .6,
  uncommon: .3,
  highTier: .06,
  noBite: .04
});

export const HIGH_TIER_APPEARANCE_SPLITS = Object.freeze({
  rare: Object.freeze({ rare: 1 }),
  epic: Object.freeze({ rare: .82, epic: .18 }),
  legendary: Object.freeze({ rare: .7, epic: .2, legendary: .1 }),
  mythic: Object.freeze({ rare: .64, epic: .2, legendary: .1, mythic: .06 }),
  miracle: Object.freeze({ rare: .6, epic: .18, legendary: .1, mythic: .08, miracle: .04 })
});

export const CAPTURE_RATE_BY_RARITY = Object.freeze({
  common: .9,
  uncommon: .7,
  rare: .6,
  epic: .5,
  legendary: .45,
  mythic: .4,
  miracle: .35
});

export const FISH_APPEARANCE_WEIGHT_RANGE = Object.freeze({ min: 80, max: 120 });
export const MAX_APPEARANCE_WEIGHT_RATIO = 1.5;

export const FISH_APPEARANCE_BONUSES = Object.freeze({
  preferredTime: .05,
  preferredWeather: .05,
  nativeSpot: .1,
  recommendedBait: .2,
  matchingBaitTag: .1
});

export const MAX_RARITY_FISH_PER_SPOT = Object.freeze({
  rare: 4,
  epic: 3,
  legendary: 2,
  mythic: 1,
  miracle: 1
});

// Migrated from the former per-fish absolute rates. The ordering is preserved,
// but these values now only divide a fixed rarity budget.
export const FISH_APPEARANCE_WEIGHTS = Object.freeze({
  sardine: 120,
  mackerel: 105,
  anchovy: 115,
  mullet: 95,
  milkfish: 85,
  grouper_juvenile: 90,
  damselfish: 110,
  wrasse: 100,
  parrotfish: 85,
  black_bream: 96,
  scorpionfish: 92,
  surgeonfish: 95,
  cutlass: 88,
  cuttlefish: 100,
  squid: 104,
  mahi: 92,
  flyingfish: 100,
  lantern: 84,
  sea_eel: 92,
  ribbon: 80,
  horse_mackerel: 110,
  threadfin_bream: 100,
  goatfish: 105,
  threeline_grunt: 115,
  yellow_boxfish: 108,
  needlefish: 88,
  red_seabream: 100,
  malabar_grouper: 80,
  mirror_butterflyfish: 112,
  greater_amberjack: 84,
  bluegreen_chromis: 120,
  pennant_coralfish: 108,
  orangespine_unicornfish: 92,
  moorish_idol: 104,
  yellowtail_fusilier: 110,
  bigeye_scad: 100,
  longface_emperor: 85,
  peacock_grouper: 84,
  yellowstripe_goatfish: 115,
  bluespotted_cornetfish: 108,
  giant_trevally: 96,
  convict_surgeonfish: 110,
  blacktip_fusilier: 105,
  goldband_fusilier: 110,
  bluestripe_snapper: 90,
  thumbprint_emperor: 85,
  blackbarred_halfbeak: 100,
  threadfin_butterflyfish: 105,
  yellowfin_goatfish: 100,
  redtooth_triggerfish: 90,
  pinecone_soldierfish: 95,
  goldlined_rabbitfish: 95,
  palette_surgeonfish: 112,
  ornate_butterflyfish: 100,
  regal_angelfish: 92,
  clown_triggerfish: 96,
  longfin_batfish: 88,
  harlequin_sweetlips: 80,
  giant_moray: 80,
  bluespine_unicornfish: 84,
  chinese_trumpetfish: 100,
  dogtooth_tuna: 80,
  scrawled_filefish: 88,
  pacific_herring: 120,
  capelin: 116,
  pacific_sand_lance: 112,
  pacific_jack_mackerel: 108,
  surf_smelt: 104,
  walleye_pollock: 100,
  pacific_cod: 96,
  rock_greenling: 92,
  kelp_greenling: 88,
  kelp_perch: 84,
  opaleye: 118,
  senorita_wrasse: 114,
  tubesnout: 110,
  pacific_tomcod: 106,
  shiner_perch: 102,
  halfmoon: 98,
  lingcod: 120,
  cabezon: 116,
  wolf_eel: 112,
  china_rockfish: 108,
  kelp_rockfish: 104,
  pacific_bonito: 100,
  sablefish: 96,
  pacific_halibut: 92,
  spotted_ratfish: 88,
  buffalo_sculpin: 84,
  painted_greenling: 118,
  blacksmith: 110,
  california_sheephead: 90,
  giant_sea_bass: 108,
  yelloweye_rockfish: 92,
  bluntnose_sixgill_shark: 84,
  ocean_sunfish: 100,
  basking_shark: 80,
  silver_biddy: 120,
  spotted_scat: 116,
  crescent_grunter: 112,
  common_ponyfish: 108,
  whitespotted_spinefoot: 104,
  dusky_rabbitfish: 100,
  orange_spotted_spinefoot: 96,
  bristle_tail_filefish: 92,
  blue_spotted_emperor: 88,
  bridled_monocle_bream: 84,
  indian_mackerel: 118,
  shortfin_scad: 114,
  indian_scad: 110,
  rainbow_sardine: 106,
  torpedo_scad: 102,
  quoys_garfish: 98,
  bartail_flathead: 94,
  banded_archerfish: 120,
  goldsilk_seabream: 116,
  mangrove_red_snapper: 112,
  orange_spotted_grouper: 108,
  indo_pacific_tarpon: 104,
  silver_sillago: 100,
  spotted_sea_catfish: 96,
  blochs_gizzard_shad: 92,
  talang_queenfish: 88,
  black_pomfret: 84,
  golden_trevally: 118,
  banded_needlefish: 110,
  longspine_emperor: 90,
  yellowtail_barracuda: 86,
  barramundi: 108,
  fourfinger_threadfin: 92,
  bluespotted_ribbontail_ray: 100,
  cobia: 84,
  narrow_barred_spanish_mackerel: 80
});

export function fishAppearanceWeight(fishId) {
  return Number(FISH_APPEARANCE_WEIGHTS[fishId]) || 0;
}

export function appearanceWeightIsValid(weight) {
  const value = Number(weight);
  return Number.isFinite(value)
    && value >= FISH_APPEARANCE_WEIGHT_RANGE.min
    && value <= FISH_APPEARANCE_WEIGHT_RANGE.max;
}

export function highTierSplitForHighestRarity(highestRarity = "rare") {
  return HIGH_TIER_APPEARANCE_SPLITS[highestRarity] || HIGH_TIER_APPEARANCE_SPLITS.rare;
}

export function cascadeHighTierSplit(highestRarity, availableRarities = []) {
  const source = highTierSplitForHighestRarity(highestRarity);
  const available = new Set(availableRarities.filter(rarity => HIGH_TIER_RARITIES.includes(rarity)));
  const shares = Object.fromEntries(HIGH_TIER_RARITIES.map(rarity => [rarity, 0]));
  for (const [rarity, share] of Object.entries(source)) {
    if (!(share > 0)) continue;
    const sourceIndex = HIGH_TIER_RARITIES.indexOf(rarity);
    let destination = available.has(rarity) ? rarity : null;
    for (let index = sourceIndex - 1; !destination && index >= 0; index -= 1) {
      if (available.has(HIGH_TIER_RARITIES[index])) destination = HIGH_TIER_RARITIES[index];
    }
    for (let index = sourceIndex + 1; !destination && index < HIGH_TIER_RARITIES.length; index += 1) {
      if (available.has(HIGH_TIER_RARITIES[index])) destination = HIGH_TIER_RARITIES[index];
    }
    if (destination) shares[destination] += share;
  }
  return shares;
}
