import test from "node:test";
import assert from "node:assert/strict";
import {
  FISH, FISH_ASSET_PURPOSES, FISH_ASSET_REPRESENTATIVES, FISH_ASSET_SPEC,
  fishAssetSrcSet, resolveFishAsset
} from "../src/data.js";

test("Slice D records a deferred-art asset contract without replacing current SVG fish", () => {
  assert.equal(FISH_ASSET_SPEC.productionStatus, "art-deferred");
  assert.equal(FISH_ASSET_SPEC.master.format, "PNG RGBA");
  assert.deepEqual(FISH_ASSET_SPEC.derivatives.widths, [192, 384, 768]);
  assert.equal(FISH_ASSET_SPEC.shimmer.treatment, "biological-iridescence");
  assert.equal(FISH_ASSET_SPEC.shimmer.forbidNeonHueReplacement, true);
  assert.equal(FISH.some(fish => fish.asset), false);
});

test("three representative silhouettes keep distinct body plans across every UI purpose", () => {
  assert.deepEqual(FISH_ASSET_REPRESENTATIVES, [
    { fishId: "sardine", bodyPlan: "slender-fusiform" },
    { fishId: "parrotfish", bodyPlan: "deep-laterally-compressed" },
    { fishId: "yellow_boxfish", bodyPlan: "box-shaped" }
  ]);

  for (const representative of FISH_ASSET_REPRESENTATIVES) {
    const fish = FISH.find(item => item.id === representative.fishId);
    assert.ok(fish);
    for (const purpose of FISH_ASSET_PURPOSES) {
      const asset = resolveFishAsset(fish, { purpose, variant: "shimmer" });
      assert.equal(asset.source, "svg-fallback");
      assert.equal(asset.bodyPlan, representative.bodyPlan);
      assert.equal(asset.width, FISH_ASSET_SPEC.purposeWidths[purpose]);
      assert.equal(asset.silhouette, purpose === "silhouette");
      assert.equal(asset.loading, purpose === "scene" ? "eager" : "lazy");
      assert.equal(asset.shimmerTreatment, "biological-iridescence");
      assert.equal(fishAssetSrcSet(asset), "");
    }
  }
});

test("the legendary sailfish keeps its bill and sail body plan across every UI purpose", () => {
  const fish = FISH.find(item => item.id === "indo_pacific_sailfish");
  assert.ok(fish);
  for (const purpose of FISH_ASSET_PURPOSES) {
    const asset = resolveFishAsset(fish, { purpose });
    assert.equal(asset.source, "svg-fallback");
    assert.equal(asset.bodyPlan, "billfish-sail-fusiform");
    assert.equal(asset.silhouette, purpose === "silhouette");
  }
});

test("future complete raster metadata can enter through the resolver without changing callers", () => {
  const fish = {
    id: "future_fish",
    shape: "torpedo",
    asset: {
      masterPath: "assets/fish/future_fish/master.png",
      derivatives: {
        192: "assets/fish/future_fish/192.webp",
        384: "assets/fish/future_fish/384.webp",
        768: "assets/fish/future_fish/768.webp"
      }
    }
  };
  const asset = resolveFishAsset(fish, { purpose: "scene" });
  assert.equal(asset.source, "raster");
  assert.equal(asset.masterPath, fish.asset.masterPath);
  assert.equal(
    fishAssetSrcSet(asset),
    "assets/fish/future_fish/192.webp 192w, assets/fish/future_fish/384.webp 384w, assets/fish/future_fish/768.webp 768w"
  );
});
