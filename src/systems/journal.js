import { FISH } from "../data.js";
import {
  DAILY_TIDE_ESSAYS, FISH_ENCOUNTER_LINES, JOURNAL_CATEGORIES, JOURNAL_ENTRY_TYPE_LABELS,
  JOURNAL_TEMPLATE_VERSION, MAIN_STORY_JOURNAL_ENTRIES, RARE_FISH_JOURNAL_ENTRIES,
  rareFishJournalEntryByFishId, storyJournalEntryByEvent
} from "../data/journal-templates.js";

export const JOURNAL_VERSION = 2;

const isObject = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const strings = value => [...new Set(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [])];
const dayNumber = value => Math.max(1, Math.floor(Number(value) || 1));
const stableIndex = (value, length) => {
  let hash = 0;
  for (const character of String(value || "")) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return length ? hash % length : 0;
};
const fill = (text, values) => Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value || ""), text);

const fixedEntryIds = new Set([
  ...RARE_FISH_JOURNAL_ENTRIES.map(entry => entry.id),
  ...MAIN_STORY_JOURNAL_ENTRIES.map(entry => entry.id)
]);
const openingEntryId = "journal:story:sleeping_tide_bay:opening";

export function createJournalState() {
  return {
    version: JOURNAL_VERSION,
    templateVersion: JOURNAL_TEMPLATE_VERSION,
    fishEncounterLineById: {},
    readEntryIds: [],
    unreadEntryIds: [],
    pendingNoticeEntryIds: []
  };
}

function migratedEntryId(entry) {
  if (!isObject(entry)) return null;
  if (fixedEntryIds.has(entry.id)) return entry.id;
  if (typeof entry.sourceId === "string" && entry.sourceId.startsWith("fish:")) {
    const candidate = `journal:${entry.sourceId}`;
    return fixedEntryIds.has(candidate) ? candidate : null;
  }
  if (typeof entry.sourceId === "string" && entry.sourceId.startsWith("resident-story:")) {
    const sceneId = entry.sourceId.split(":").at(-1);
    return MAIN_STORY_JOURNAL_ENTRIES.find(candidate => candidate.unlock?.sceneId === sceneId)?.id || null;
  }
  if (entry.id === "journal:intro") return openingEntryId;
  return null;
}

export function normalizeJournalState(raw) {
  const source = isObject(raw) ? raw : {};
  if (source.version === JOURNAL_VERSION) {
    const readEntryIds = strings(source.readEntryIds).filter(id => fixedEntryIds.has(id));
    const read = new Set(readEntryIds);
    const unreadEntryIds = strings(source.unreadEntryIds).filter(id => fixedEntryIds.has(id) && !read.has(id));
    const unread = new Set(unreadEntryIds);
    return {
      version: JOURNAL_VERSION,
      templateVersion: JOURNAL_TEMPLATE_VERSION,
      fishEncounterLineById: Object.fromEntries(Object.entries(isObject(source.fishEncounterLineById) ? source.fishEncounterLineById : {})
        .filter(([fishId, line]) => FISH.some(fish => fish.id === fishId) && typeof line === "string" && line.trim())),
      readEntryIds,
      unreadEntryIds,
      pendingNoticeEntryIds: strings(source.pendingNoticeEntryIds).filter(id => fixedEntryIds.has(id) && unread.has(id))
    };
  }

  const base = createJournalState();
  const oldEntries = [
    ...(Array.isArray(source.permanentEntries) ? source.permanentEntries : []),
    ...(Array.isArray(source.entries) ? source.entries : [])
  ];
  const oldUnread = new Set(strings(source.unreadEntryIds));
  const readEntryIds = [];
  const unreadEntryIds = [];
  for (const entry of oldEntries) {
    const id = migratedEntryId(entry);
    if (!id) continue;
    if (oldUnread.has(entry.id)) unreadEntryIds.push(id);
    else readEntryIds.push(id);
  }
  return {
    ...base,
    fishEncounterLineById: Object.fromEntries(Object.entries(isObject(source.fishEncounterLineById) ? source.fishEncounterLineById : {})
      .filter(([fishId, line]) => FISH.some(fish => fish.id === fishId) && typeof line === "string" && line.trim())),
    readEntryIds: [...new Set(readEntryIds)],
    unreadEntryIds: [...new Set(unreadEntryIds)].filter(id => !readEntryIds.includes(id)),
    pendingNoticeEntryIds: []
  };
}

function encounterLine(event, fish) {
  const pool = FISH_ENCOUNTER_LINES[event.timeId] || FISH_ENCOUNTER_LINES.day;
  const spotName = event.spotId === "shore" ? "近岸淺灘" : event.spotId === "reef" ? "礁石邊緣" : "潮水裡";
  return fill(pool[stableIndex(`${event.eventId}:${fish.id}`, pool.length)], { fishName: fish.name, spotName });
}

function isRareFishUnlocked(state, fishId) {
  const record = state?.discovered?.[fishId];
  return Number(record?.manualCount ?? record?.count) > 0;
}

function isStoryEntryUnlocked(state, entry) {
  const unlock = entry?.unlock;
  if (unlock?.type === "initial") return true;
  if (unlock?.type === "region-event") return Number(state?.bayEventHistory?.[unlock.eventId]?.completions) > 0;
  if (unlock?.type === "resident-scene") {
    return Object.values(state?.residentStories || {}).some(record => strings(record?.completedSceneIds).includes(unlock.sceneId));
  }
  return false;
}

export function unlockedJournalEntryIds(state) {
  return [
    ...RARE_FISH_JOURNAL_ENTRIES.filter(entry => isRareFishUnlocked(state, entry.fishId)).map(entry => entry.id),
    ...MAIN_STORY_JOURNAL_ENTRIES.filter(entry => isStoryEntryUnlocked(state, entry)).map(entry => entry.id)
  ];
}

export function syncJournalUnlocks(state) {
  const journal = normalizeJournalState(state?.journal);
  const unlocked = unlockedJournalEntryIds(state);
  const known = new Set([...journal.readEntryIds, ...journal.unreadEntryIds]);
  const newlyUnlocked = unlocked.filter(id => !known.has(id));
  return {
    ...journal,
    unreadEntryIds: [...journal.unreadEntryIds, ...newlyUnlocked],
    pendingNoticeEntryIds: [...new Set([...journal.pendingNoticeEntryIds, ...newlyUnlocked])]
  };
}

function todayEntry(state) {
  const sailingDay = dayNumber(state?.day);
  const essay = DAILY_TIDE_ESSAYS[stableIndex(`atlas-tide:${sailingDay}`, DAILY_TIDE_ESSAYS.length)];
  return {
    id: `journal:today:${sailingDay}`,
    categoryId: "today",
    type: "today",
    sailingDay,
    title: essay.title,
    body: essay.body,
    closing: essay.closing,
    meta: `第 ${sailingDay} 航海日 · 今日自動撰寫`
  };
}

function fixedEntryView(entry, state) {
  if (entry.type === "fish") {
    const fish = FISH.find(candidate => candidate.id === entry.fishId);
    const record = state?.discovered?.[entry.fishId];
    return {
      ...entry,
      meta: `${fish?.name || entry.fishId} · 首次親手捕獲 ${record?.firstCaught ? new Date(record.firstCaught).toLocaleDateString("zh-TW") : "已記錄"}`
    };
  }
  const category = JOURNAL_CATEGORIES.find(candidate => candidate.id === entry.categoryId);
  return {
    ...entry,
    meta: entry.type === "event"
      ? `${category?.name || "特殊海況"} · 選填、不影響主線`
      : `${category?.name || "海域"} · 主線第 ${category?.chapter || "—"} 章`
  };
}

export function getJournalEntries(state, categoryId = "today") {
  if (categoryId === "today") return [todayEntry(state)];
  if (categoryId === "rare_fish") {
    return RARE_FISH_JOURNAL_ENTRIES
      .filter(entry => isRareFishUnlocked(state, entry.fishId))
      .map(entry => fixedEntryView(entry, state));
  }
  return MAIN_STORY_JOURNAL_ENTRIES
    .filter(entry => entry.categoryId === categoryId && isStoryEntryUnlocked(state, entry))
    .sort((left, right) => left.order - right.order)
    .map(entry => fixedEntryView(entry, state));
}

export function getJournalEntry(state, entryId) {
  if (entryId === `journal:today:${dayNumber(state?.day)}`) return todayEntry(state);
  const entry = [...RARE_FISH_JOURNAL_ENTRIES, ...MAIN_STORY_JOURNAL_ENTRIES].find(candidate => candidate.id === entryId);
  if (!entry || !unlockedJournalEntryIds(state).includes(entry.id)) return null;
  return fixedEntryView(entry, state);
}

export function getJournalCategories(state) {
  const journal = syncJournalUnlocks(state);
  const unread = new Set(journal.unreadEntryIds);
  return JOURNAL_CATEGORIES.map(category => {
    const entries = getJournalEntries(state, category.id);
    const total = category.id === "rare_fish"
      ? RARE_FISH_JOURNAL_ENTRIES.length
      : ["story", "events"].includes(category.kind)
        ? MAIN_STORY_JOURNAL_ENTRIES.filter(entry => entry.categoryId === category.id).length
        : 1;
    return {
      ...category,
      unlockedCount: entries.length,
      totalCount: total,
      unreadCount: entries.filter(entry => unread.has(entry.id)).length
    };
  });
}

export function getJournalUnreadCount(state) {
  const journal = syncJournalUnlocks(state);
  const unlocked = new Set(unlockedJournalEntryIds(state));
  return journal.unreadEntryIds.filter(id => unlocked.has(id)).length;
}

export function applyJournalEvent(rawState, event) {
  let state = normalizeJournalState(rawState);
  if (!isObject(event) || typeof event.eventId !== "string" || ["migration", "auto", "offline"].includes(event.source)) {
    return { ok: true, state, createdEntries: [] };
  }

  let encounterLineValue = null;
  const fish = event.type === "fish.discovered" ? FISH.find(item => item.id === event.refs?.fishId) : null;
  if (fish && !state.fishEncounterLineById[fish.id]) {
    encounterLineValue = encounterLine(event, fish);
    state = { ...state, fishEncounterLineById: { ...state.fishEncounterLineById, [fish.id]: encounterLineValue } };
  }

  const entry = fish ? rareFishJournalEntryByFishId(fish.id) : storyJournalEntryByEvent(event);
  if (!entry || state.readEntryIds.includes(entry.id) || state.unreadEntryIds.includes(entry.id)) {
    return { ok: true, state, createdEntries: [], encounterLine: encounterLineValue };
  }

  return {
    ok: true,
    state: {
      ...state,
      unreadEntryIds: [...state.unreadEntryIds, entry.id],
      pendingNoticeEntryIds: [...state.pendingNoticeEntryIds, entry.id]
    },
    createdEntries: [entry],
    encounterLine: encounterLineValue
  };
}

export function markJournalEntriesRead(rawState, entryIds) {
  const state = normalizeJournalState(rawState);
  const read = new Set(strings(entryIds).filter(id => fixedEntryIds.has(id)));
  return {
    ...state,
    readEntryIds: [...new Set([...state.readEntryIds, ...read])],
    unreadEntryIds: state.unreadEntryIds.filter(id => !read.has(id))
  };
}

export function acknowledgeJournalNotices(rawState, entryIds = null) {
  const state = normalizeJournalState(rawState);
  const acknowledged = entryIds ? new Set(strings(entryIds)) : new Set(state.pendingNoticeEntryIds);
  return { ...state, pendingNoticeEntryIds: state.pendingNoticeEntryIds.filter(id => !acknowledged.has(id)) };
}

// Compatibility no-op: today is derived from the current sailing day and is never archived.
export function sealJournalDay(rawState) {
  return normalizeJournalState(rawState);
}

export { JOURNAL_ENTRY_TYPE_LABELS };
