import {
  OBSERVATION_SUBJECTS, WONDERS, getObservationSubjectsForSpot, getWondersForSpot,
  observationSubjectById, wonderById
} from "../data/observations.js";
import { regionSpotById } from "../data/regions.js";

const safeDay = value => Math.max(1, Math.floor(Number(value) || 1));
const uniqueStrings = values => [...new Set(Array.isArray(values) ? values.filter(value => typeof value === "string" && value) : [])];

function normalizeRecord(raw, fallbackDay = 1) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    firstObservedAt: typeof source.firstObservedAt === "string" && !Number.isNaN(Date.parse(source.firstObservedAt))
      ? source.firstObservedAt
      : null,
    firstObservedDay: safeDay(source.firstObservedDay || fallbackDay),
    lastObservedDay: safeDay(source.lastObservedDay || source.firstObservedDay || fallbackDay),
    count: Math.max(1, Math.floor(Number(source.count) || 1)),
    spotId: typeof source.spotId === "string" ? source.spotId : null,
    timeId: typeof source.timeId === "string" ? source.timeId : null,
    weatherId: typeof source.weatherId === "string" ? source.weatherId : null
  };
}

export function createObservationState() {
  return {
    recordsById: {},
    wonderRecordsById: {},
    attemptsById: {},
    visitedPeriodKeys: []
  };
}

export function createDeveloperObservationState({ day = 99, observedAt = new Date().toISOString() } = {}) {
  const state = createObservationState();
  for (const subject of OBSERVATION_SUBJECTS) {
    state.recordsById[subject.id] = normalizeRecord({
      firstObservedAt: observedAt,
      firstObservedDay: day,
      lastObservedDay: day,
      count: 1,
      spotId: subject.spotId,
      timeId: subject.timeIds[0],
      weatherId: subject.weatherIds[0]
    }, day);
  }
  for (const wonder of WONDERS) {
    state.wonderRecordsById[wonder.id] = normalizeRecord({
      firstObservedAt: observedAt,
      firstObservedDay: day,
      lastObservedDay: day,
      count: 1,
      spotId: wonder.spotId,
      timeId: wonder.timeIds[0],
      weatherId: wonder.weatherIds[0]
    }, day);
  }
  return state;
}

export function normalizeObservationState(raw, day = 1) {
  const source = raw && typeof raw === "object" ? raw : {};
  const state = createObservationState();
  for (const [subjectId, record] of Object.entries(source.recordsById || {})) {
    if (observationSubjectById(subjectId)) state.recordsById[subjectId] = normalizeRecord(record, day);
  }
  for (const [wonderId, record] of Object.entries(source.wonderRecordsById || {})) {
    if (wonderById(wonderId)) state.wonderRecordsById[wonderId] = normalizeRecord(record, day);
  }
  state.attemptsById = Object.fromEntries(OBSERVATION_SUBJECTS.map(subject => [
    subject.id,
    Math.min(subject.pityVisits, Math.max(0, Math.floor(Number(source.attemptsById?.[subject.id]) || 0)))
  ]).filter(([, attempts]) => attempts > 0));
  state.visitedPeriodKeys = uniqueStrings(source.visitedPeriodKeys).slice(-96);
  return state;
}

export function hasObservation(state, subjectId) {
  return Boolean(state?.recordsById?.[subjectId]);
}

export function hasWonder(state, wonderId) {
  return Boolean(state?.wonderRecordsById?.[wonderId]);
}

function isEligible(entry, context, observationState) {
  if (entry.regionId !== context.regionId || entry.spotId !== context.spotId) return false;
  if (!entry.timeIds.includes(context.timeId) || !entry.weatherIds.includes(context.weatherId)) return false;
  return (entry.requiresObservationIds || []).every(subjectId => hasObservation(observationState, subjectId));
}

function observationPeriodKey(context) {
  return `${context.spotId}:${safeDay(context.day)}:${context.timeId}`;
}

function makeRecord(entry, context) {
  return normalizeRecord({
    firstObservedAt: context.observedAt,
    firstObservedDay: context.day,
    lastObservedDay: context.day,
    count: 1,
    spotId: entry.spotId,
    timeId: context.timeId,
    weatherId: context.weatherId
  }, context.day);
}

export function getObservationHint(state, spotId, { timeId = null, weatherId = null } = {}) {
  const subjects = getObservationSubjectsForSpot(spotId);
  const next = subjects.find(subject => !hasObservation(state, subject.id)
    && (subject.requiresObservationIds || []).every(id => hasObservation(state, id)));
  if (!next) return "正式觀察頁已完整亮起。換個時段回來，仍可能遇見不列入完成度的奇景。";
  if (timeId && !next.timeIds.includes(timeId)) return `${next.hint} 現在的光線還不合適，換個時段再來即可。`;
  if (weatherId && !next.weatherIds.includes(weatherId)) return `${next.hint} 天氣改變後再來即可。`;
  const attempts = Math.max(0, Number(state?.attemptsById?.[next.id]) || 0);
  return attempts > 0 ? next.missHint : next.hint;
}

export function visitObservationSpot(observationState, context, random = Math.random) {
  const spot = regionSpotById(context?.spotId);
  const valid = spot?.activityType === "observation"
    && spot.regionId === context?.regionId
    && context?.docked === true;
  if (!valid) return { ok: false, reason: "invalid-observation-spot", state: observationState };

  const current = normalizeObservationState(observationState, context.day);
  const periodKey = observationPeriodKey(context);
  if (current.visitedPeriodKeys.includes(periodKey)) {
    return {
      ok: true,
      repeatedPeriod: true,
      kind: "quiet",
      state: current,
      hint: getObservationHint(current, context.spotId, context)
    };
  }
  const next = structuredClone(current);
  next.visitedPeriodKeys = [...next.visitedPeriodKeys, periodKey].slice(-96);

  const subjects = getObservationSubjectsForSpot(context.spotId)
    .filter(subject => !hasObservation(next, subject.id) && isEligible(subject, context, next));
  for (const subject of subjects) {
    const attempts = (next.attemptsById[subject.id] || 0) + 1;
    next.attemptsById[subject.id] = attempts;
    if (attempts >= subject.pityVisits || random() < subject.baseChance) {
      next.recordsById[subject.id] = makeRecord(subject, context);
      delete next.attemptsById[subject.id];
      return { ok: true, kind: "subject", isNew: true, subject, state: next };
    }
  }

  const wonders = getWondersForSpot(context.spotId)
    .filter(wonder => !hasWonder(next, wonder.id) && isEligible(wonder, context, next));
  for (const wonder of wonders) {
    if (random() < wonder.chance) {
      next.wonderRecordsById[wonder.id] = makeRecord(wonder, context);
      return { ok: true, kind: "wonder", isNew: true, wonder, state: next };
    }
  }

  return {
    ok: true,
    kind: "quiet",
    state: next,
    hint: getObservationHint(next, context.spotId, context)
  };
}

export function recordObservationSubject(observationState, subjectId, context = {}) {
  const subject = observationSubjectById(subjectId);
  if (!subject) return { ok: false, state: observationState };
  const next = normalizeObservationState(observationState, context.day);
  const isNew = !hasObservation(next, subjectId);
  next.recordsById[subjectId] = next.recordsById[subjectId] || makeRecord(subject, {
    day: context.day || 1,
    observedAt: context.observedAt || new Date().toISOString(),
    timeId: context.timeId || subject.timeIds[0],
    weatherId: context.weatherId || subject.weatherIds[0]
  });
  delete next.attemptsById[subjectId];
  return { ok: true, isNew, subject, state: next };
}
