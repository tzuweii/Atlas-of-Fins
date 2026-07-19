export const FISH_BODY_CLASS_ORDER = Object.freeze([
  "small", "standard", "large", "gigantic", "colossal"
]);

export const FISH_BODY_CLASSES = Object.freeze({
  small: Object.freeze({ name: "小型" }),
  standard: Object.freeze({ name: "一般" }),
  large: Object.freeze({ name: "大型" }),
  gigantic: Object.freeze({ name: "超大型" }),
  colossal: Object.freeze({ name: "巨獸級" })
});

export const MINIMUM_BODY_CLASS_BY_RARITY = Object.freeze({
  rare: "large",
  epic: "gigantic",
  legendary: "gigantic",
  mythic: "gigantic",
  miracle: "gigantic"
});

export function bodyClassMeetsMinimum(bodyClass, minimumBodyClass) {
  const actualIndex = FISH_BODY_CLASS_ORDER.indexOf(bodyClass);
  const minimumIndex = FISH_BODY_CLASS_ORDER.indexOf(minimumBodyClass);
  return actualIndex >= 0 && minimumIndex >= 0 && actualIndex >= minimumIndex;
}
