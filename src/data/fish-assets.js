export const FISH_ASSET_PURPOSES = Object.freeze(["journal", "scene", "silhouette", "card", "aquarium"]);

export const FISH_ASSET_SPEC = Object.freeze({
  version: 1,
  productionStatus: "art-deferred",
  master: Object.freeze({
    width: 1024,
    height: 1024,
    format: "PNG RGBA",
    colorSpace: "sRGB",
    safeTransparentMargin: 48,
    budgetBytes: 768 * 1024
  }),
  derivatives: Object.freeze({
    format: "WebP RGBA",
    widths: Object.freeze([192, 384, 768]),
    budgetBytes: Object.freeze({ 192: 48 * 1024, 384: 128 * 1024, 768: 320 * 1024 })
  }),
  purposeWidths: Object.freeze({
    journal: 192,
    scene: 768,
    silhouette: 192,
    card: 384,
    aquarium: 192
  }),
  shimmer: Object.freeze({
    treatment: "biological-iridescence",
    palette: Object.freeze(["pearl", "seafoam", "warm-gold"]),
    forbidNeonHueReplacement: true
  })
});

export const FISH_BODY_PLANS = Object.freeze({
  slender: "slender-fusiform",
  torpedo: "torpedo-fusiform",
  round: "rounded",
  flat: "deep-laterally-compressed",
  spiky: "spiny-bottom-dweller",
  ribbon: "ribbon-like",
  cephalopod: "cephalopod",
  mahi: "high-forehead-fusiform",
  winged: "extended-pectoral-fin",
  glow: "small-photophore-fish",
  box: "box-shaped",
  needle: "needle-like",
  billfish: "billfish-sail-fusiform"
});

export const FISH_ASSET_REPRESENTATIVES = Object.freeze([
  Object.freeze({ fishId: "sardine", bodyPlan: FISH_BODY_PLANS.slender }),
  Object.freeze({ fishId: "parrotfish", bodyPlan: FISH_BODY_PLANS.flat }),
  Object.freeze({ fishId: "yellow_boxfish", bodyPlan: FISH_BODY_PLANS.box })
]);

const isRasterReady = fish => Boolean(
  fish?.asset?.masterPath
  && fish?.asset?.derivatives
  && FISH_ASSET_SPEC.derivatives.widths.every(width => typeof fish.asset.derivatives[width] === "string")
);

export function resolveFishAsset(fish, { purpose = "card", variant = "normal" } = {}) {
  const safePurpose = FISH_ASSET_PURPOSES.includes(purpose) ? purpose : "card";
  const safeVariant = variant === "shimmer" ? "shimmer" : "normal";
  const rasterReady = isRasterReady(fish);
  return {
    fishId: fish?.id || null,
    source: rasterReady ? "raster" : "svg-fallback",
    bodyPlan: FISH_BODY_PLANS[fish?.shape] || "rounded",
    purpose: safePurpose,
    width: FISH_ASSET_SPEC.purposeWidths[safePurpose],
    variant: safeVariant,
    silhouette: safePurpose === "silhouette",
    loading: safePurpose === "scene" ? "eager" : "lazy",
    decoding: "async",
    masterPath: rasterReady ? fish.asset.masterPath : null,
    derivatives: rasterReady ? fish.asset.derivatives : null,
    shimmerTreatment: safeVariant === "shimmer" ? FISH_ASSET_SPEC.shimmer.treatment : null
  };
}

export function fishAssetSrcSet(resolvedAsset) {
  if (resolvedAsset?.source !== "raster") return "";
  return FISH_ASSET_SPEC.derivatives.widths
    .map(width => `${resolvedAsset.derivatives[width]} ${width}w`)
    .join(", ");
}
