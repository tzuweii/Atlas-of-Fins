export const PORTABLE_SAVE_FORMAT = "atlas-of-fins-portable-save";
export const PORTABLE_SAVE_FORMAT_VERSION = 1;

const validMode = mode => mode === "normal" || mode === "developer";
const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function createPortableSave(state, {
  mode = state?.developerMode ? "developer" : "normal",
  exportedAt = new Date().toISOString()
} = {}) {
  if (!isObject(state) || !validMode(mode)) throw new TypeError("invalid-save-state");
  return JSON.stringify({
    format: PORTABLE_SAVE_FORMAT,
    formatVersion: PORTABLE_SAVE_FORMAT_VERSION,
    mode,
    exportedAt,
    saveVersion: Number(state.version) || 0,
    state
  }, null, 2);
}

export function parsePortableSave(text, {
  expectedMode = "normal",
  maxSaveVersion = Number.POSITIVE_INFINITY,
  migrate = value => value
} = {}) {
  if (!validMode(expectedMode) || typeof text !== "string" || !text.trim()) {
    return { ok: false, reason: "empty" };
  }
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
  if (!isObject(payload)
    || payload.format !== PORTABLE_SAVE_FORMAT
    || payload.formatVersion !== PORTABLE_SAVE_FORMAT_VERSION
    || !isObject(payload.state)) {
    return { ok: false, reason: "invalid-format" };
  }
  if (payload.mode !== expectedMode) return { ok: false, reason: "mode-mismatch" };
  const stateIsDeveloper = payload.state.developerMode === true;
  if ((expectedMode === "developer") !== stateIsDeveloper) return { ok: false, reason: "mode-mismatch" };
  const sourceVersion = Math.max(0, Math.floor(Number(payload.state.version) || 0));
  if (sourceVersion < 1) return { ok: false, reason: "invalid-version" };
  if (sourceVersion > maxSaveVersion) return { ok: false, reason: "unsupported-version" };
  try {
    const state = migrate(structuredClone(payload.state));
    if (!isObject(state)) return { ok: false, reason: "invalid-state" };
    return {
      ok: true,
      state,
      mode: payload.mode,
      exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : null,
      sourceVersion
    };
  } catch {
    return { ok: false, reason: "invalid-state" };
  }
}
