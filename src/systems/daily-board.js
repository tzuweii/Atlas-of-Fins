import { DAILY_GOAL_TEMPLATES } from "../data/daily-goals.js";
import { isProgressConditionAvailable, progressIncrement } from "./progress-events.js";

const safeDay = value => Math.max(1, Math.floor(Number(value) || 1));

export function createDailyGoalEntry(template, day, index = 0, overrides = {}) {
  if (!template) return null;
  const boardDay = safeDay(day);
  return {
    instanceId: `${boardDay}-${index}-${template.id}`,
    templateId: template.id,
    text: template.text,
    condition: structuredClone(template.condition),
    progress: 0,
    goal: template.goal,
    reward: structuredClone(template.reward),
    claimed: false,
    ...overrides
  };
}

export function getAvailableDailyGoalTemplates(context = {}, templates = DAILY_GOAL_TEMPLATES) {
  return templates.filter(template => isProgressConditionAvailable(template.condition, context));
}

export function createDailyBoard(day, context = {}, templates = DAILY_GOAL_TEMPLATES) {
  const boardDay = safeDay(day);
  const available = getAvailableDailyGoalTemplates(context, templates);
  if (!available.length) return { day: boardDay, entries: [] };
  const offset = (boardDay - 1) % available.length;
  const steps = available.length >= 4 ? [0, 1, 3] : available.map((_, index) => index).slice(0, 3);
  const entries = steps.map((step, index) => createDailyGoalEntry(available[(offset + step) % available.length], boardDay, index));
  return { day: boardDay, entries };
}

// v0.3 compatibility helper. New state should store the enclosing dailyBoard object.
export function createDailyQuests(day, templates = DAILY_GOAL_TEMPLATES, context = {}) {
  return createDailyBoard(day, context, templates).entries;
}

function templateIdFromLegacy(entry) {
  if (typeof entry?.templateId === "string") return entry.templateId;
  if (typeof entry?.id === "string") return entry.id;
  if (typeof entry?.instanceId !== "string") return null;
  return DAILY_GOAL_TEMPLATES.find(template => entry.instanceId.endsWith(`-${template.id}`))?.id || null;
}

function normalizeEntry(entry, day, index) {
  const template = DAILY_GOAL_TEMPLATES.find(item => item.id === templateIdFromLegacy(entry));
  if (!template) return null;
  const progress = Math.min(template.goal, Math.max(0, Number(entry?.progress) || 0));
  return createDailyGoalEntry(template, day, index, {
    instanceId: typeof entry.instanceId === "string" && entry.instanceId ? entry.instanceId : `${safeDay(day)}-${index}-${template.id}`,
    progress,
    claimed: Boolean(entry.claimed && progress >= template.goal)
  });
}

export function normalizeDailyBoard(rawBoard, day, context = {}, legacyEntries = null) {
  const boardDay = safeDay(day);
  const rawEntries = rawBoard?.day === boardDay && Array.isArray(rawBoard.entries)
    ? rawBoard.entries
    : Array.isArray(legacyEntries) ? legacyEntries : null;
  if (!rawEntries?.length) return createDailyBoard(boardDay, context);
  const entries = rawEntries.map((entry, index) => normalizeEntry(entry, boardDay, index)).filter(Boolean).slice(0, 3);
  return entries.length ? { day: boardDay, entries } : createDailyBoard(boardDay, context);
}

export function applyDailyGoalProgress(board, event) {
  const safeBoard = board && typeof board === "object" ? board : { day: 1, entries: [] };
  const entries = Array.isArray(safeBoard.entries) ? safeBoard.entries : [];
  return {
    ...safeBoard,
    entries: entries.map(entry => {
      if (!entry || entry.claimed || entry.progress >= entry.goal) return entry;
      const increment = progressIncrement(entry.condition, event);
      if (!increment) return entry;
      return { ...entry, progress: Math.min(entry.goal, entry.progress + increment) };
    })
  };
}

export function applyDailyQuestProgress(entries, event) {
  return applyDailyGoalProgress({ day: 1, entries }, event).entries;
}

export function claimDailyGoal(board, instanceId) {
  const entries = Array.isArray(board?.entries) ? board.entries : [];
  const index = entries.findIndex(entry => entry?.instanceId === instanceId);
  const entry = entries[index];
  if (!entry || entry.claimed || entry.progress < entry.goal) return { ok: false, board, reward: null };
  const nextEntries = entries.map((item, entryIndex) => entryIndex === index ? { ...item, claimed: true } : item);
  return { ok: true, board: { ...board, entries: nextEntries }, reward: structuredClone(entry.reward), entry: nextEntries[index] };
}

export function claimDailyQuest(entries, instanceId) {
  const result = claimDailyGoal({ day: 1, entries }, instanceId);
  return { ...result, entries: result.board?.entries || entries };
}

export function claimCompletedDailyGoals(board) {
  let nextBoard = board;
  const claims = [];
  for (const entry of board?.entries || []) {
    if (entry.claimed || entry.progress < entry.goal) continue;
    const result = claimDailyGoal(nextBoard, entry.instanceId);
    if (!result.ok) continue;
    nextBoard = result.board;
    claims.push({ entry: result.entry, reward: result.reward });
  }
  return { board: nextBoard, claims };
}
