export const TEXT_SCALE_OPTIONS = Object.freeze([
  { id: "small", label: "精簡", scale: 0.92 },
  { id: "standard", label: "標準", scale: 1 },
  { id: "large", label: "放大", scale: 1.16 }
]);

export const UI_SCALE_OPTIONS = Object.freeze([
  { id: "compact", label: "寬廣", scale: 0.92 },
  { id: "standard", label: "標準", scale: 1 },
  { id: "large", label: "放大", scale: 1.1 }
]);

export const DEFAULT_SOUND_VOLUME = 80;

function normalizeOption(value, options, fallback = "standard") {
  return options.some(option => option.id === value) ? value : fallback;
}

export function normalizeTextScale(value) {
  return normalizeOption(value, TEXT_SCALE_OPTIONS);
}

export function normalizeUiScale(value) {
  return normalizeOption(value, UI_SCALE_OPTIONS);
}

export function normalizeSoundVolume(value) {
  if (value === null || value === undefined || value === "") return DEFAULT_SOUND_VOLUME;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : DEFAULT_SOUND_VOLUME;
}

export function normalizeDisplaySettings(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    sound: source.sound !== false,
    soundVolume: normalizeSoundVolume(source.soundVolume),
    reducedMotion: false,
    textScale: normalizeTextScale(source.textScale),
    uiScale: normalizeUiScale(source.uiScale)
  };
}

export function displayScaleValue(options, id) {
  return options.find(option => option.id === id)?.scale || 1;
}
