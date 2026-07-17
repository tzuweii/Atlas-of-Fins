import { COMMISSION_TEMPLATES, commissionTemplateById, getResidentCommissionTemplates } from "../data/commissions.js";
import { RESIDENTS, residentById } from "../data/residents.js";
import { isProgressConditionAvailable, progressIncrement } from "./progress-events.js";

const safeDay = value => Math.max(1, Math.floor(Number(value) || 1));

export function createCommissionEntry(template, day, overrides = {}) {
  if (!template) return null;
  const offerDay = safeDay(day);
  return {
    instanceId: `${offerDay}-${template.residentId}-${template.id}`,
    templateId: template.id,
    residentId: template.residentId,
    title: template.title,
    description: template.description,
    condition: structuredClone(template.condition),
    progress: 0,
    goal: template.goal,
    reward: structuredClone(template.reward),
    offeredDay: offerDay,
    ...overrides
  };
}

function availableTemplates(residentId, context) {
  return getResidentCommissionTemplates(residentId).filter(template => isProgressConditionAvailable(template.condition, context));
}

export function createResidentOffer(residentId, day, context = {}, forcedTemplateId = null) {
  const templates = availableTemplates(residentId, context);
  if (!templates.length) return null;
  const forced = forcedTemplateId ? templates.find(template => template.id === forcedTemplateId) : null;
  const residentIndex = Math.max(0, RESIDENTS.findIndex(resident => resident.id === residentId));
  const template = forced || templates[(safeDay(day) - 1 + residentIndex) % templates.length];
  return createCommissionEntry(template, day);
}

export function createResidentCommissionState(day, context = {}) {
  const offerDay = safeDay(day);
  const offersByResident = {};
  const offerDayByResident = {};
  for (const resident of RESIDENTS) {
    if (!context.availableRegionIds?.includes(resident.regionId)) continue;
    offersByResident[resident.id] = createResidentOffer(resident.id, offerDay, context);
    offerDayByResident[resident.id] = offerDay;
  }
  return { offerDayByResident, offersByResident, active: null, history: {} };
}

function normalizeHistory(raw) {
  const history = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(RESIDENTS.map(resident => {
    const entry = history[resident.id] && typeof history[resident.id] === "object" ? history[resident.id] : {};
    const completedTemplateIds = [...new Set((Array.isArray(entry.completedTemplateIds) ? entry.completedTemplateIds : [])
      .filter(templateId => commissionTemplateById(templateId)?.residentId === resident.id))];
    const completions = Math.max(completedTemplateIds.length, Math.max(0, Math.floor(Number(entry.completions) || 0)));
    return [resident.id, { completions, completedTemplateIds }];
  }).filter(([, entry]) => entry.completions > 0 || entry.completedTemplateIds.length));
}

function normalizeCommissionEntry(raw, day, { active = false } = {}) {
  const template = commissionTemplateById(raw?.templateId);
  if (!template || raw?.residentId !== template.residentId) return null;
  const progress = Math.min(template.goal, Math.max(0, Number(raw.progress) || 0));
  return createCommissionEntry(template, raw.offeredDay || day, {
    instanceId: typeof raw.instanceId === "string" && raw.instanceId ? raw.instanceId : `${safeDay(day)}-${template.residentId}-${template.id}`,
    progress,
    ...(active ? { acceptedDay: safeDay(raw.acceptedDay || day) } : {})
  });
}

export function normalizeResidentCommissionState(raw, day, context = {}) {
  const boardDay = safeDay(day);
  const source = raw && typeof raw === "object" ? raw : {};
  const state = {
    offerDayByResident: { ...(source.offerDayByResident || {}) },
    offersByResident: {},
    active: normalizeCommissionEntry(source.active, boardDay, { active: true }),
    history: normalizeHistory(source.history)
  };

  for (const resident of RESIDENTS) {
    if (!context.availableRegionIds?.includes(resident.regionId)) continue;
    const sourceOffer = normalizeCommissionEntry(source.offersByResident?.[resident.id], boardDay);
    if (Number(state.offerDayByResident[resident.id]) === boardDay) {
      if (sourceOffer && sourceOffer.residentId === resident.id) state.offersByResident[resident.id] = sourceOffer;
      continue;
    }
    state.offerDayByResident[resident.id] = boardDay;
    if (state.active?.residentId !== resident.id) state.offersByResident[resident.id] = createResidentOffer(resident.id, boardDay, context);
  }
  return state;
}

export function refreshResidentOffers(state, day, context = {}) {
  return normalizeResidentCommissionState(state, day, context);
}

export function setResidentOffer(state, residentId, templateId, day, context = {}) {
  const resident = residentById(residentId);
  const template = commissionTemplateById(templateId);
  if (!resident || template?.residentId !== residentId || !isProgressConditionAvailable(template.condition, context)) return { ok: false, state };
  const next = structuredClone(state);
  next.offerDayByResident[residentId] = safeDay(day);
  next.offersByResident[residentId] = createResidentOffer(residentId, day, context, templateId);
  return { ok: true, state: next, offer: next.offersByResident[residentId] };
}

export function acceptResidentCommission(state, residentId, day) {
  if (state?.active) return { ok: false, state };
  const offer = state?.offersByResident?.[residentId];
  if (!offer) return { ok: false, state };
  const next = structuredClone(state);
  next.active = { ...offer, acceptedDay: safeDay(day) };
  delete next.offersByResident[residentId];
  return { ok: true, state: next, commission: next.active };
}

export function applyResidentCommissionProgress(state, event) {
  const active = state?.active;
  if (!active || active.progress >= active.goal) return state;
  const increment = progressIncrement(active.condition, event);
  if (!increment) return state;
  return { ...state, active: { ...active, progress: Math.min(active.goal, active.progress + increment) } };
}

export function completeActiveResidentCommission(state) {
  if (!state?.active) return { ok: false, state };
  return { ok: true, state: { ...state, active: { ...state.active, progress: state.active.goal } } };
}

export function dropResidentCommission(state) {
  if (!state?.active) return { ok: false, state };
  return { ok: true, state: { ...state, active: null } };
}

export function deliverResidentCommission(state, { residentId, regionId, docked }) {
  const active = state?.active;
  const resident = residentById(residentId);
  if (!active || active.residentId !== residentId || active.progress < active.goal || !resident || resident.regionId !== regionId || !docked) {
    return { ok: false, state, reason: "invalid-delivery" };
  }
  const next = structuredClone(state);
  const history = next.history[residentId] || { completions: 0, completedTemplateIds: [] };
  next.history[residentId] = {
    completions: history.completions + 1,
    completedTemplateIds: [...new Set([...history.completedTemplateIds, active.templateId])]
  };
  next.active = null;
  return {
    ok: true,
    state: next,
    commission: active,
    reward: structuredClone(active.reward),
    dialogue: commissionTemplateById(active.templateId)?.completionDialogue || resident.dialogue.ready
  };
}

export function clearResidentCommissionHistory(state) {
  return { ...state, history: {} };
}

export { COMMISSION_TEMPLATES };
