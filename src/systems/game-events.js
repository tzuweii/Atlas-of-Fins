export const GAME_EVENT_SOURCES = Object.freeze(["manual", "auto", "offline", "migration", "developer"]);
export const RECENT_GAME_EVENT_LIMIT = 24;

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const safeDate = value => typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
const safeString = value => typeof value === "string" && value.trim() ? value : null;
const uniqueStrings = values => [...new Set(Array.isArray(values) ? values.filter(value => typeof value === "string" && value) : [])];

function normalizeEvent(raw) {
  if (!isObject(raw) || !safeString(raw.eventId) || !safeString(raw.type)) return null;
  const sequence = Math.max(1, Math.floor(Number(raw.sequence) || 1));
  return {
    eventId: raw.eventId,
    sequence,
    type: raw.type,
    source: GAME_EVENT_SOURCES.includes(raw.source) ? raw.source : "manual",
    occurredAt: safeDate(raw.occurredAt),
    sailingDay: Math.max(1, Math.floor(Number(raw.sailingDay) || 1)),
    timeId: safeString(raw.timeId),
    weatherId: safeString(raw.weatherId),
    regionId: safeString(raw.regionId),
    spotId: safeString(raw.spotId),
    shipId: safeString(raw.shipId),
    refs: isObject(raw.refs) ? { ...raw.refs } : {},
    payload: isObject(raw.payload) ? { ...raw.payload } : {},
    consumerIds: uniqueStrings(raw.consumerIds),
    consumedBy: uniqueStrings(raw.consumedBy),
    errorsByConsumer: isObject(raw.errorsByConsumer) ? { ...raw.errorsByConsumer } : {}
  };
}

export function createGameEventState() {
  return { nextSequence: 1, pending: [], recent: [] };
}

export function normalizeGameEventState(raw) {
  const source = isObject(raw) ? raw : {};
  const seen = new Set();
  const pending = [];
  for (const candidate of Array.isArray(source.pending) ? source.pending : []) {
    const event = normalizeEvent(candidate);
    if (!event || seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    pending.push(event);
  }
  const recent = [];
  for (const candidate of Array.isArray(source.recent) ? source.recent : []) {
    const event = normalizeEvent(candidate);
    if (!event || seen.has(event.eventId)) continue;
    seen.add(event.eventId);
    recent.push({ ...event, payload: {} });
  }
  const highestSequence = [...pending, ...recent].reduce((highest, event) => Math.max(highest, event.sequence), 0);
  return {
    nextSequence: Math.max(highestSequence + 1, Math.floor(Number(source.nextSequence) || 1)),
    pending,
    recent: recent.slice(-RECENT_GAME_EVENT_LIMIT)
  };
}

export function enqueueGameEvent(rawState, input, { consumerIds = [] } = {}) {
  const state = normalizeGameEventState(rawState);
  const explicitId = safeString(input?.eventId);
  const duplicate = explicitId && [...state.pending, ...state.recent].find(event => event.eventId === explicitId);
  if (duplicate) return { state, event: duplicate, duplicate: true };
  if (!safeString(input?.type)) return { state, event: null, duplicate: false, error: "invalid-type" };

  const sequence = state.nextSequence;
  const event = normalizeEvent({
    ...input,
    eventId: explicitId || `event:${sequence}`,
    sequence,
    occurredAt: safeDate(input?.occurredAt) || new Date().toISOString(),
    consumerIds,
    consumedBy: [],
    errorsByConsumer: {}
  });
  if (!event) return { state, event: null, duplicate: false, error: "invalid-event" };
  return {
    state: { ...state, nextSequence: sequence + 1, pending: [...state.pending, event] },
    event,
    duplicate: false
  };
}

export function consumeGameEvent(rawState, eventId, consumers = {}) {
  const state = normalizeGameEventState(rawState);
  const index = state.pending.findIndex(event => event.eventId === eventId);
  if (index < 0) return { state, event: state.recent.find(event => event.eventId === eventId) || null, complete: true, results: {} };

  let event = state.pending[index];
  const results = {};
  for (const consumerId of event.consumerIds) {
    if (event.consumedBy.includes(consumerId)) continue;
    const consumer = consumers[consumerId];
    if (typeof consumer !== "function") continue;
    try {
      const result = consumer(event);
      if (result?.ok === false) throw new Error(result.reason || "consumer-rejected");
      results[consumerId] = result;
      event = {
        ...event,
        consumedBy: [...new Set([...event.consumedBy, consumerId])],
        errorsByConsumer: Object.fromEntries(Object.entries(event.errorsByConsumer).filter(([id]) => id !== consumerId))
      };
    } catch (error) {
      event = {
        ...event,
        errorsByConsumer: { ...event.errorsByConsumer, [consumerId]: String(error?.message || "consumer-failed") }
      };
    }
  }

  const complete = event.consumerIds.every(consumerId => event.consumedBy.includes(consumerId));
  const pending = [...state.pending];
  if (!complete) {
    pending[index] = event;
    return { state: { ...state, pending }, event, complete: false, results };
  }
  pending.splice(index, 1);
  const compact = { ...event, payload: {}, errorsByConsumer: {} };
  return {
    state: { ...state, pending, recent: [...state.recent, compact].slice(-RECENT_GAME_EVENT_LIMIT) },
    event: compact,
    complete: true,
    results
  };
}
