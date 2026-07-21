import { tideglowSourceByEventType, tideglowSourceId } from "../data/tideglow.js";

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

export function createTideglowState() {
  return { enabled: false, seenIntro: false, total: 0, ledgerBySourceId: {}, developerAdjustment: 0 };
}

export function normalizeTideglowState(raw, { allowDeveloperAdjustment = false } = {}) {
  const source = isObject(raw) ? raw : {};
  const ledgerBySourceId = Object.fromEntries(Object.entries(isObject(source.ledgerBySourceId) ? source.ledgerBySourceId : {})
    .filter(([sourceId, entry]) => typeof sourceId === "string" && sourceId && isObject(entry) && Number(entry.points) > 0)
    .map(([sourceId, entry]) => [sourceId, {
      sourceId,
      eventId: typeof entry.eventId === "string" ? entry.eventId : null,
      eventType: typeof entry.eventType === "string" ? entry.eventType : null,
      label: typeof entry.label === "string" ? entry.label : "潮光里程碑",
      points: Math.max(1, Math.floor(Number(entry.points) || 0)),
      awardedAt: safeDate(entry.awardedAt),
      refs: isObject(entry.refs) ? { ...entry.refs } : {}
    }]));
  const ledgerTotal = Object.values(ledgerBySourceId).reduce((sum, entry) => sum + entry.points, 0);
  const developerAdjustment = allowDeveloperAdjustment
    ? Math.trunc(Number(source.developerAdjustment) || 0)
    : 0;
  // Backward-compat: existing saves with points already earned are treated as enabled/intro-seen.
  const enabled = Boolean(source.enabled) || ledgerTotal > 0;
  const seenIntro = Boolean(source.seenIntro) || ledgerTotal > 0;
  return {
    enabled,
    seenIntro,
    total: Math.max(0, ledgerTotal + developerAdjustment),
    ledgerBySourceId,
    developerAdjustment: Math.max(-ledgerTotal, developerAdjustment)
  };
}

export function applyTideglowEvent(rawState, event, {
  allowDeveloperAdjustment = false,
  allowDeveloperSource = false
} = {}) {
  const state = normalizeTideglowState(rawState, { allowDeveloperAdjustment });
  const source = tideglowSourceByEventType(event?.type);
  const allowedSource = ["manual", "tutorial"].includes(event?.source) || (event?.source === "developer" && allowDeveloperSource);
  const sourceId = tideglowSourceId(source, event?.refs);
  if (!source || !allowedSource || !sourceId) return { state, awarded: false, reason: "ineligible" };
  if (state.ledgerBySourceId[sourceId]) {
    return { state, awarded: false, reason: "duplicate", entry: state.ledgerBySourceId[sourceId] };
  }
  const entry = {
    sourceId,
    eventId: event.eventId,
    eventType: event.type,
    label: source.label,
    points: source.points,
    awardedAt: safeDate(event.occurredAt) || new Date().toISOString(),
    refs: isObject(event.refs) ? { ...event.refs } : {}
  };
  const next = {
    ...state,
    total: state.total + source.points,
    ledgerBySourceId: { ...state.ledgerBySourceId, [sourceId]: entry }
  };
  return { state: next, awarded: true, points: source.points, entry };
}

export function adjustDeveloperTideglow(rawState, delta) {
  const state = normalizeTideglowState(rawState, { allowDeveloperAdjustment: true });
  const change = Math.trunc(Number(delta) || 0);
  const nextAdjustment = Math.max(
    -Object.values(state.ledgerBySourceId).reduce((sum, entry) => sum + entry.points, 0),
    state.developerAdjustment + change
  );
  return normalizeTideglowState({ ...state, developerAdjustment: nextAdjustment }, { allowDeveloperAdjustment: true });
}
